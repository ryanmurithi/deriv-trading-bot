const WebSocket = require('ws');
const config = require('./config');
const logger = require('./logger');
const risk = require('./risk');

// Bot state variables
let ws = null;
let reconnectTimer = null;
let pingInterval = null;
let cooldownTimer = null;

let isShuttingDown = false;
let isTrading = false;
let onCooldown = false;
let pausedByRisk = false;

// Request ID generator
let reqIdCounter = 1;
function nextReqId() {
  return reqIdCounter++;
}

// Active trade state
let pendingProposalReqId = null;
let pendingBuyReqId = null;
let activeContractId = null;
let activeSubscriptionId = null;
let lastBetDirection = null; // Used for alternating strategy

// Last N tick digits
const tickHistory = [];

// Session statistics
const stats = {
  totalTrades: 0,
  wins: 0,
  losses: 0,
  consecutiveLosses: 0,
  netProfit: 0,
  currentBalance: 0,
  winRate: 0,
  lastResult: null,
  lastStake: 0
};

// Update win rate
function updateWinRate() {
  stats.winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
}

/**
 * Sends JSON payload via WebSocket
 */
function sendJSON(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Connect to Deriv WebSocket API
 */
function connect() {
  if (isShuttingDown) return;

  const url = `wss://ws.binaryws.com/websockets/v3?app_id=1089`;
  logger.info(`Connecting to Deriv WebSocket API at ${url}...`);

  ws = new WebSocket(url);

  ws.on('open', onOpen);
  ws.on('message', onMessage);
  ws.on('close', onClose);
  ws.on('error', onError);
}

/**
 * WebSocket on open handler
 */
function onOpen() {
  logger.success('WebSocket connection established.');
  
  // Start heartbeat ping
  startHeartbeat();

  // Authenticate using the token
  const token = process.env.DERIV_TOKEN;
  if (!token) {
    logger.error('DERIV_TOKEN environment variable is not defined.');
    process.exit(1);
  }

  logger.info('Authenticating connection...');
  sendJSON({
    authorize: token,
    req_id: nextReqId()
  });
}

/**
 * WebSocket on close handler
 */
function onClose(code, reason) {
  if (isShuttingDown) {
    logger.info('WebSocket connection closed gracefully.');
    return;
  }

  logger.warn(`WebSocket connection closed (Code: ${code}, Reason: ${reason || 'None'}). Reconnecting in 5 seconds...`);
  cleanupConnectionState();
  
  reconnectTimer = setTimeout(connect, 5000);
}

/**
 * WebSocket on error handler
 */
function onError(err) {
  logger.error(`WebSocket connection error: ${err.message}`);
}

/**
 * Cleans up temporary timers and intervals
 */
function cleanupConnectionState() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  // Clear any active request mappings
  pendingProposalReqId = null;
  pendingBuyReqId = null;
}

/**
 * Start 30-second ping interval to keep connection alive
 */
function startHeartbeat() {
  if (pingInterval) clearInterval(pingInterval);
  pingInterval = setInterval(() => {
    sendJSON({ ping: 1 });
  }, 30000);
}

/**
 * WebSocket message processor
 */
function onMessage(data) {
  try {
    const response = JSON.parse(data.toString());

    // Handle generic errors
    if (response.error) {
      handleAPIError(response);
      return;
    }

    const msgType = response.msg_type;

    switch (msgType) {
      case 'authorize':
        handleAuthorizeResponse(response.authorize);
        break;

      case 'balance':
        handleBalanceResponse(response.balance);
        break;

      case 'tick':
        handleTickResponse(response.tick);
        break;

      case 'proposal':
        if (response.req_id === pendingProposalReqId) {
          handleProposalResponse(response.proposal);
        }
        break;

      case 'buy':
        if (response.req_id === pendingBuyReqId) {
          handleBuyResponse(response.buy);
        }
        break;

      case 'proposal_open_contract':
        handleProposalOpenContractResponse(response.proposal_open_contract, response.subscription);
        break;

      case 'ping':
        // Heartbeat response, ignore
        break;

      default:
        // Ignore unhandled message types
        break;
    }
  } catch (err) {
    logger.error(`Error parsing message: ${err.message}`);
  }
}

/**
 * Handle errors returned by the API
 */
function handleAPIError(response) {
  const err = response.error;
  logger.error(`API Error [Code: ${err.code}]: ${err.message}`);

  // Reset active trading flags if relevant
  if (response.req_id === pendingProposalReqId || response.req_id === pendingBuyReqId || activeContractId) {
    logger.warn('Resetting trading state due to API error.');
    isTrading = false;
    pendingProposalReqId = null;
    pendingBuyReqId = null;
    activeContractId = null;
    activeSubscriptionId = null;
  }
}

/**
 * Process authorization response
 */
function handleAuthorizeResponse(authData) {
  const isVirtual = authData.is_virtual === 1;
  const email = authData.email;
  const currency = authData.currency || 'USD';
  stats.currentBalance = parseFloat(authData.balance || 0);

  logger.success(`Authorized successfully as ${email} (Account: ${authData.loginid})`);
  logger.info(`Initial Balance: $${stats.currentBalance.toFixed(2)} ${currency}`);

  // Safety check: if DEMO_MODE is true, ensure it's a virtual account
  if (config.DEMO_MODE && !isVirtual) {
    logger.error('CRITICAL SAFETY BLOCK: DEMO_MODE is enabled, but you authorized a REAL account.');
    logger.error('Shutdown triggered immediately to protect your funds.');
    stop();
    process.exit(1);
  } else if (!config.DEMO_MODE && isVirtual) {
    logger.warn('Notice: DEMO_MODE is disabled, but you are authorized on a VIRTUAL (demo) account.');
  } else if (config.DEMO_MODE && isVirtual) {
    logger.success('Safety Verification: Confirmed running on VIRTUAL (demo) account. Sandbox mode active.');
  } else {
    logger.warn('WARNING: Running on a REAL-MONEY account. Live trading active.');
  }

  // Subscribe to balance updates
  sendJSON({
    balance: 1,
    subscribe: 1,
    req_id: nextReqId()
  });

  // Subscribe to ticks
  logger.info(`Subscribing to tick stream for ${config.symbol}...`);
  sendJSON({
    ticks: config.symbol,
    req_id: nextReqId()
  });

  // Re-verify active contract after connection drops
  if (activeContractId) {
    logger.info(`Reconnected during an active trade. Checking contract status for ID: ${activeContractId}`);
    sendJSON({
      proposal_open_contract: 1,
      contract_id: activeContractId,
      req_id: nextReqId()
    });
  }
}

/**
 * Process balance updates
 */
function handleBalanceResponse(balanceData) {
  stats.currentBalance = parseFloat(balanceData.balance);
}

/**
 * Process tick stream messages
 */
function handleTickResponse(tickData) {
  if (tickData.symbol !== config.symbol) return;

  const quote = parseFloat(tickData.quote);
  const pipSize = tickData.pip_size !== undefined ? tickData.pip_size : 2;

  // Convert quote to correct decimal precision and extract last digit
  const quoteStr = quote.toFixed(pipSize);
  const lastDigitChar = quoteStr.slice(-1);
  const lastDigit = parseInt(lastDigitChar, 10);

  if (isNaN(lastDigit)) return;

  // Add to sliding window history
  tickHistory.push(lastDigit);
  if (tickHistory.length > config.frequencyLookback) {
    tickHistory.shift();
  }

  // Log progress while gathering data
  if (tickHistory.length < config.frequencyLookback) {
    logger.info(`Collecting ticks: ${tickHistory.length}/${config.frequencyLookback} (Last digit: ${lastDigit})`);
    return;
  }

  // Run strategy evaluation
  evaluateAndTrade();
}

/**
 * Evaluate strategy and trigger trade
 */
function evaluateAndTrade() {
  // Guard checks
  if (isTrading || onCooldown || pausedByRisk || isShuttingDown) {
    return;
  }

  const direction = getStrategyDecision();
  if (!direction) return;

  // Perform risk limit checks before placing the trade
  const riskCheck = risk.checkLimits(stats, config);
  if (riskCheck.hitLimit) {
    logger.error(`RISK HALT: ${riskCheck.reason}`);
    logger.warn('Trading bot is now paused. Please adjust config parameters or restart.');
    pausedByRisk = true;
    return;
  }

  // Set trading lock
  isTrading = true;

  // Calculate next stake amount
  const nextStake = risk.calculateNextStake(stats, config);

  logger.info(`Strategy Signal: ${direction} | Stake: $${nextStake.toFixed(2)} | Evaluating trade entry...`);

  // Step 1: Send Proposal Request
  const reqId = nextReqId();
  pendingProposalReqId = reqId;
  
  sendJSON({
    proposal: 1,
    amount: nextStake,
    basis: 'stake',
    contract_type: direction,
    currency: 'USD',
    duration: config.contractDuration,
    duration_unit: config.contractDurationUnit,
    symbol: config.symbol,
    req_id: reqId
  });
}

/**
 * Runs the selected strategy and returns the contract direction ('DIGITEVEN' | 'DIGITODD')
 */
function getStrategyDecision() {
  const strategy = config.strategyType;

  if (strategy === 'alternating') {
    const decision = lastBetDirection === 'DIGITEVEN' ? 'DIGITODD' : 'DIGITEVEN';
    return decision;
  }

  if (strategy === 'random') {
    return Math.random() < 0.5 ? 'DIGITEVEN' : 'DIGITODD';
  }

  if (strategy === 'frequency') {
    let evenCount = 0;
    let oddCount = 0;

    for (const digit of tickHistory) {
      if (digit % 2 === 0) {
        evenCount++;
      } else {
        oddCount++;
      }
    }

    if (evenCount > oddCount) {
      // Contrarian: even appeared more, bet odd
      return 'DIGITODD';
    } else if (oddCount > evenCount) {
      // Contrarian: odd appeared more, bet even
      return 'DIGITEVEN';
    } else {
      // Tie breaker
      const fallback = config.fallbackStrategy;
      if (fallback === 'random') {
        return Math.random() < 0.5 ? 'DIGITEVEN' : 'DIGITODD';
      } else {
        // Default to alternating fallback
        return lastBetDirection === 'DIGITEVEN' ? 'DIGITODD' : 'DIGITEVEN';
      }
    }
  }

  return null;
}

/**
 * Step 2: Process proposal response and purchase the contract
 */
function handleProposalResponse(proposalData) {
  pendingProposalReqId = null;

  logger.info(`Proposal received. Ask Price: $${proposalData.ask_price}. Placing buy order...`);

  const reqId = nextReqId();
  pendingBuyReqId = reqId;

  sendJSON({
    buy: proposalData.id,
    price: proposalData.ask_price,
    req_id: reqId
  });
}

/**
 * Step 3: Process buy response and subscribe to open contract updates
 */
function handleBuyResponse(buyData) {
  pendingBuyReqId = null;
  activeContractId = buyData.contract_id;

  logger.info(`Contract purchased successfully. Contract ID: ${activeContractId}`);

  // Subscribe to contract state
  sendJSON({
    proposal_open_contract: 1,
    contract_id: activeContractId,
    subscribe: 1,
    req_id: nextReqId()
  });
}

/**
 * Step 4: Process contract updates and handle win/loss outcome
 */
function handleProposalOpenContractResponse(poc, subscription) {
  // If we reconnected, subscription might be empty, but we got contract details
  if (poc.contract_id !== activeContractId) return;

  // Track subscription ID for clean forget unsubscribe later
  if (subscription && subscription.id && !activeSubscriptionId) {
    activeSubscriptionId = subscription.id;
  }

  const status = poc.status;

  // Check if contract has ended (won or lost)
  if (status === 'won' || status === 'lost') {
    const profit = parseFloat(poc.profit);
    const stake = parseFloat(poc.buy_price || poc.ask_price || 0);
    const direction = poc.contract_type;

    // Unsubscribe from this contract's open updates to prevent leaks
    if (activeSubscriptionId) {
      sendJSON({
        forget: activeSubscriptionId,
        req_id: nextReqId()
      });
    }

    // Update session metrics
    stats.totalTrades++;
    stats.lastStake = stake;

    if (status === 'won') {
      stats.wins++;
      stats.consecutiveLosses = 0;
      stats.lastResult = 'win';
    } else {
      stats.losses++;
      stats.consecutiveLosses++;
      stats.lastResult = 'loss';
    }

    stats.netProfit += profit;
    updateWinRate();

    // Track direction for alternating fallback strategy
    lastBetDirection = direction;

    // Log the trade outcome
    logger.trade({
      direction,
      stake,
      outcome: status,
      profit,
      balance: stats.currentBalance
    });

    // Reset trade states
    activeContractId = null;
    activeSubscriptionId = null;
    isTrading = false;

    // Trigger Cooldown
    triggerCooldown();
  }
}

/**
 * Apply cooldown between trades
 */
function triggerCooldown() {
  onCooldown = true;
  logger.info(`Cooldown active for ${config.cooldownSeconds} seconds...`);

  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(() => {
    onCooldown = false;
    logger.info('Cooldown finished. Ready for next trade signal.');
  }, config.cooldownSeconds * 1000);
}

/**
 * Start the bot
 */
function start() {
  isShuttingDown = false;
  pausedByRisk = false;
  connect();
}

/**
 * Stop the bot and perform cleanup
 */
function stop() {
  isShuttingDown = true;
  logger.info('Stopping trading bot and clearing resources...');

  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cleanupConnectionState();

  if (ws) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }
}

module.exports = {
  start,
  stop,
  stats
};
