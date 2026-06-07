const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'trades.log');

// ANSI Colors
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

/**
 * Format date to YYYY-MM-DD HH:MM:SS
 */
function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Append a raw text message to trades.log
 */
function appendToFile(msg) {
  try {
    fs.appendFileSync(LOG_FILE, `[${getTimestamp()}] ${msg}\n`, 'utf8');
  } catch (err) {
    console.error(`${COLORS.red}Failed to write to log file: ${err.message}${COLORS.reset}`);
  }
}

const logger = {
  info: (msg) => {
    const formatted = `[INFO] ${msg}`;
    console.log(`${COLORS.cyan}${formatted}${COLORS.reset}`);
    appendToFile(formatted);
  },

  success: (msg) => {
    const formatted = `[SUCCESS] ${msg}`;
    console.log(`${COLORS.green}${COLORS.bright}${formatted}${COLORS.reset}`);
    appendToFile(formatted);
  },

  warn: (msg) => {
    const formatted = `[WARNING] ${msg}`;
    console.log(`${COLORS.yellow}${COLORS.bright}${formatted}${COLORS.reset}`);
    appendToFile(formatted);
  },

  error: (msg) => {
    const formatted = `[ERROR] ${msg}`;
    console.log(`${COLORS.red}${COLORS.bright}${formatted}${COLORS.reset}`);
    appendToFile(formatted);
  },

  trade: (trade) => {
    const { direction, stake, outcome, profit, balance } = trade;
    const isWin = outcome.toLowerCase() === 'win';
    const outcomeColor = isWin ? COLORS.green : COLORS.red;
    const sign = profit >= 0 ? '+' : '';
    
    // Console output
    console.log(
      `${COLORS.bright}--------------------------------------------------\n` +
      `${COLORS.cyan}[TRADE]${COLORS.reset} Timestamp: ${COLORS.white}${getTimestamp()}${COLORS.reset} | ` +
      `Direction: ${COLORS.bright}${direction}${COLORS.reset}\n` +
      `        Stake: $${stake.toFixed(2)} | ` +
      `Outcome: ${outcomeColor}${COLORS.bright}${outcome.toUpperCase()}${COLORS.reset} | ` +
      `Profit/Loss: ${outcomeColor}${sign}$${profit.toFixed(2)}$${COLORS.reset}\n` +
      `        Running Balance: ${COLORS.cyan}${COLORS.bright}$${balance.toFixed(2)}$${COLORS.reset}\n` +
      `${COLORS.bright}--------------------------------------------------`
    );

    // File output
    const fileLog = `TRADE: Direction: ${direction} | Stake: $${stake.toFixed(2)} | Outcome: ${outcome.toUpperCase()} | Profit/Loss: ${sign}$${profit.toFixed(2)} | Balance: $${balance.toFixed(2)}`;
    appendToFile(fileLog);
  },

  sessionSummary: (stats) => {
    const { totalTrades, wins, losses, winRate, netProfit, currentBalance } = stats;
    const profitColor = netProfit >= 0 ? COLORS.green : COLORS.red;
    const sign = netProfit >= 0 ? '+' : '';

    console.log(
      `\n${COLORS.magenta}${COLORS.bright}=================== SESSION SUMMARY ===================\n` +
      ` Total Trades       : ${totalTrades}\n` +
      ` Wins / Losses      : ${COLORS.green}${wins}${COLORS.magenta} / ${COLORS.red}${losses}${COLORS.magenta}\n` +
      ` Win Rate           : ${COLORS.cyan}${winRate.toFixed(2)}%${COLORS.magenta}\n` +
      ` Total Profit/Loss  : ${profitColor}${sign}$${netProfit.toFixed(2)}${COLORS.magenta}\n` +
      ` Current Balance    : ${COLORS.white}$${currentBalance.toFixed(2)}${COLORS.magenta}\n` +
      `=======================================================${COLORS.reset}\n`
    );

    const fileLog = `SESSION SUMMARY: Total Trades: ${totalTrades} | Wins/Losses: ${wins}/${losses} | Win Rate: ${winRate.toFixed(2)}% | Net Profit/Loss: ${sign}$${netProfit.toFixed(2)} | Balance: $${currentBalance.toFixed(2)}`;
    appendToFile(fileLog);
  }
};

module.exports = logger;
