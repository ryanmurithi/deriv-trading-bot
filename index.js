// Load environment variables
require('dotenv').config();

const bot = require('./bot');
const logger = require('./logger');

// Verify token presence
const token = process.env.DERIV_TOKEN;
if (!token) {
  logger.error('CRITICAL: DERIV_TOKEN is not defined in your environment variables.');
  logger.info('Please create a .env file in the root directory and add your token, e.g.:');
  console.log('\n  DERIV_TOKEN=your_deriv_api_token_here\n');
  process.exit(1);
}

logger.info('======================================================');
logger.info('         DERIV EVEN/ODD TRADING BOT INITIALIZED        ');
logger.info('======================================================');

// Start the trading bot
bot.start();

/**
 * Handle graceful shutdown
 */
function handleShutdown() {
  logger.warn('\nShutdown signal received (Ctrl+C). Cleaning up...');
  
  // Stop the bot connections & timers
  bot.stop();

  // Print final session statistics
  logger.sessionSummary(bot.stats);

  logger.success('Goodbye!');
  process.exit(0);
}

// Intercept exit signals
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
