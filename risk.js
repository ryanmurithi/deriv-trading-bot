/**
 * Risk Management Module
 */
const logger = require('./logger');

/**
 * Checks if any session risk limits have been breached.
 * @param {Object} stats - Current session statistics
 * @param {Object} config - Bot configuration
 * @returns {Object} { hitLimit: boolean, reason: string }
 */
function checkLimits(stats, config) {
  // 1. Daily Loss Limit Check
  // stats.netProfit is negative if in loss.
  if (config.dailyLossLimit && stats.netProfit <= -config.dailyLossLimit) {
    const reason = `Daily loss limit of $${config.dailyLossLimit.toFixed(2)} hit! Current net loss: $${Math.abs(stats.netProfit).toFixed(2)}`;
    return { hitLimit: true, reason };
  }

  // 2. Max Consecutive Losses Check
  if (config.maxConsecutiveLosses && stats.consecutiveLosses >= config.maxConsecutiveLosses) {
    const reason = `Max consecutive losses limit of ${config.maxConsecutiveLosses} reached!`;
    return { hitLimit: true, reason };
  }

  return { hitLimit: false };
}

/**
 * Calculates the stake for the next trade.
 * @param {Object} stats - Current session statistics
 * @param {Object} config - Bot configuration
 * @returns {number} The stake size for the next contract
 */
function calculateNextStake(stats, config) {
  // If martingale is disabled, always return the base stake
  if (!config.useMartingale) {
    return config.stake;
  }

  // Initial state (no trades yet)
  if (stats.totalTrades === 0 || !stats.lastResult) {
    return config.stake;
  }

  // If the last trade was a win, reset to starting stake
  if (stats.lastResult === 'win') {
    logger.info(`Last trade won. Resetting stake to starting amount: $${config.stake.toFixed(2)}`);
    return config.stake;
  }

  // If the last trade was a loss, apply Martingale logic
  if (stats.lastResult === 'loss') {
    // Check if we hit the max martingale steps
    if (stats.consecutiveLosses >= config.maxMartingaleSteps) {
      logger.warn(`Max Martingale steps (${config.maxMartingaleSteps}) reached. Resetting stake to starting amount: $${config.stake.toFixed(2)}`);
      return config.stake;
    }

    // Calculate next stake
    const lastStake = stats.lastStake || config.stake;
    let nextStake = lastStake * config.martingaleMultiplier;

    // Check if next stake exceeds maxStake cap
    if (nextStake > config.maxStake) {
      logger.warn(`Calculated Martingale stake $${nextStake.toFixed(2)} exceeds Max Stake Cap of $${config.maxStake.toFixed(2)}. Capping at $${config.maxStake.toFixed(2)}`);
      nextStake = config.maxStake;
    } else {
      logger.info(`Last trade lost. Applying Martingale: stake increased from $${lastStake.toFixed(2)} to $${nextStake.toFixed(2)} (Step ${stats.consecutiveLosses} of ${config.maxMartingaleSteps})`);
    }

    return nextStake;
  }

  return config.stake;
}

module.exports = {
  checkLimits,
  calculateNextStake
};
