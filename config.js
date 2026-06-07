module.exports = {
  // --- Account Safety & Environment ---
  // DEMO_MODE: If true, the bot will verify that the authorized account is a virtual/demo account.
  // If it's a real account, the bot will immediately stop and error out to prevent losses of real money.
  DEMO_MODE: true,

  // --- Contract Settings ---
  // symbol: The asset index to trade on (e.g. Volatility 100 Index -> 'R_100')
  // Common symbols: 'R_10', 'R_25', 'R_50', 'R_75', 'R_100', '1HZ10V' (Volatility 10 (1s) Index)
  symbol: 'R_100',

  // contractDuration: How long the contract lasts. For Even/Odd, 1 tick is standard.
  contractDuration: 1,

  // contractDurationUnit: 't' for ticks, 'm' for minutes, etc.
  contractDurationUnit: 't',

  // --- Stake & Money Management ---
  // stake: Starting stake amount in USD (or account currency)
  stake: 0.35,

  // useMartingale: If true, the stake is multiplied after a loss
  useMartingale: true,

  // martingaleMultiplier: Multiplier used after a loss (typically 2.0 to double)
  martingaleMultiplier: 2.0,

  // maxMartingaleSteps: Max consecutive losses allowed under martingale before resetting to starting stake
  maxMartingaleSteps: 5,

  // maxStake: The maximum allowed stake size. Martingale calculations will be capped at this.
  maxStake: 50.0,

  // --- Risk Limits ---
  // dailyLossLimit: Maximum loss limit for the session. The bot stops automatically when net loss reaches or exceeds this.
  dailyLossLimit: 10.0,

  // maxConsecutiveLosses: The maximum number of consecutive losses allowed before pausing trading and alerting the user.
  maxConsecutiveLosses: 3,

  // cooldownSeconds: Cooldown period in seconds to wait between trades
  cooldownSeconds: 5,

  // --- Strategy Settings ---
  // strategyType: The strategy to use. Options are:
  // - 'frequency': Track recent tick digits, buy DIGITODD if Even digits have appeared more, and vice versa.
  // - 'alternating': Alternates between DIGITEVEN and DIGITODD.
  // - 'random': Enters random DIGITEVEN or DIGITODD contract.
  strategyType: 'frequency',

  // frequencyLookback: The number of recent tick digits to track and analyze for 'frequency' strategy
  frequencyLookback: 10,

  // fallbackStrategy: Strategy to use when frequency analysis has an equal number of even and odd digits ('alternating' or 'random')
  fallbackStrategy: 'alternating',
};
