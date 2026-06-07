<<<<<<< HEAD
# Deriv Even/Odd Trading Bot

A robust, automated Node.js trading bot that executes Even/Odd digits contracts on Deriv Volatility indices via the native WebSockets API. The bot implements a configurable contrarian frequency analysis strategy (and fallback options), automatic risk management, Martingale position scaling, clear console and file logging, and a strict safety gate to prevent accidental real-money trading.

---

## Features

- **Native WebSockets**: Fast connection using the lightweight, native `ws` library.
- **Auto-Reconnection**: Automatically detects drops and reconnects, restoring tick streams and resolving outstanding trades.
- **Environment Safety (`DEMO_MODE`)**: A configurable guard checking the authorized account type. If `DEMO_MODE` is enabled but a real account is authenticated, the bot instantly halts to protect your funds.
- **Smart Digit Precision**: Extracts the last digit directly based on the index's exact `pip_size` to prevent JavaScript floating-point errors.
- **Flexible Strategies**:
  - `frequency`: Contrarian frequency analysis (tracks recent digits, bets `DIGITODD` if Even digits appeared more, and vice versa).
  - `alternating`: Alternates bet direction on every trade.
  - `random`: Enters a random direction on every trade.
- **Martingale Stake Engine**: Optional Martingale multiplier scaling after losses, with configurable multiplier, maximum steps limit (resetting on step limit), and absolute stake cap.
- **Automated Risk Protection**:
  - `dailyLossLimit`: Shuts down trading automatically if the session loss exceeds a threshold.
  - `maxConsecutiveLosses`: Pauses trading and alerts if too many losses occur in a row.
  - `cooldownSeconds`: Configurable sleep duration between contracts.
- **Clean Shutdown**: Gracefully exits on `Ctrl+C`, outputting a summary of session results.
- **Auditable Logging**: Visual ANSI colors in the CLI, plus raw text logs appended to a local `trades.log` file.

---

## Installation & Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) installed (v16.0.0 or higher recommended).
- A Deriv account (Demo or Real).

### 2. Install Dependencies
Navigate to the project root and run:
```bash
npm install
```
This will install `ws` (WebSocket client) and `dotenv` (environment variables loader).

### 3. Obtain a Deriv API Token
1. Go to your **Deriv Account Dashboard**.
2. Click **Account Settings** -> **API Token**.
3. Under "Choose scopes for your token", check **Read** and **Trade**.
4. Give your token a name (e.g., `BotTest`) and click **Create**.
5. Copy the generated token string.
   > [!IMPORTANT]
   > Keep your token private. Never share it or push it to public repositories.

### 4. Create the Environment File
Create a new file named `.env` in the root of the project (next to `package.json`).
Add your token inside:
```env
DERIV_TOKEN=your_copied_api_token_here
```

---

## Configuration (`config.js`)

All settings live in [config.js](file:///c:/Users/user/Desktop/deriv/config.js). You can modify them at any time without touching the core logic.

| Setting | Default | Description |
| :--- | :--- | :--- |
| **`DEMO_MODE`** | `true` | **Safety Guard**: Checks that the authorized account is virtual/demo. If set to `true` and you authorize using a REAL token, the bot will refuse to run. |
| **`symbol`** | `'R_100'` | The symbol index to trade on. Examples: `'R_100'` (Volatility 100 Index), `'R_50'`, `'1HZ10V'` (Volatility 10 (1s) Index). |
| **`contractDuration`** | `1` | Duration of the trade contract. |
| **`contractDurationUnit`**| `'t'` | Duration unit. `'t'` represents ticks (strongly recommended for digit trades). |
| **`stake`** | `0.35` | The initial stake amount per trade. |
| **`useMartingale`** | `true` | Toggles Martingale position scaling on/off. |
| **`martingaleMultiplier`**| `2.0` | Factor to multiply the stake by after a loss (e.g., `2.0` doubles the stake). |
| **`maxMartingaleSteps`** | `5` | Maximum number of losses before Martingale resets to the starting `stake`. |
| **`maxStake`** | `50.0` | The absolute maximum stake size. Martingale calculations will be capped at this value. |
| **`dailyLossLimit`** | `10.0` | Session loss limit. Trading halts if total losses exceed this amount. |
| **`maxConsecutiveLosses`**| `3` | Maximum consecutive losses before the bot pauses and alerts you. |
| **`cooldownSeconds`** | `5` | Cooldown wait time (seconds) between contracts. |
| **`strategyType`** | `'frequency'`| The strategy to run (`'frequency'`, `'alternating'`, or `'random'`). |
| **`frequencyLookback`** | `10` | The number of recent ticks to monitor for the `'frequency'` strategy. |
| **`fallbackStrategy`** | `'alternating'`| Fallback strategy if `'frequency'` returns a tie (equal even/odd counts). Options: `'alternating'`, `'random'`. |

---

## Running the Bot

To start the bot, run:
```bash
npm start
```

### Clean Shutdown
Press **`Ctrl+C`** in the terminal to stop the bot. The bot will automatically clean up subscriptions, close connections, print a colorful **Session Summary** containing total trades, win rate, and total profit/loss, and write the summary to `trades.log`.

---

## Log Output Examples

### Console Logging
The bot outputs beautifully styled CLI metrics:
- **`[INFO]`**: State changes, connection progress, and data collection notifications.
- **`[SUCCESS]`**: Connection authorization status, demo-mode validations.
- **`[TRADE]`**: Detailed table of execution: Direction, Stake, Outcome (green `WON` / red `LOST`), Profit, and Running Balance.
- **`[SESSION SUMMARY]`**: Displayed on exit, showing cumulative performance indicators.

### File Logging (`trades.log`)
Each major transaction is timestamped and appended to the local `trades.log` file, enabling persistent analysis:
```text
[2026-06-01 13:05:00] [INFO] Connecting to Deriv WebSocket API at wss://ws.binaryws.com/websockets/v3?app_id=1089...
[2026-06-01 13:05:01] [SUCCESS] Authorized successfully as trader@example.com (Account: VRTC12345)
[2026-06-01 13:05:01] [SUCCESS] Safety Verification: Confirmed running on VIRTUAL (demo) account. Sandbox mode active.
[2026-06-01 13:05:05] [INFO] Ticks: 10/10 (Last digit: 4)
[2026-06-01 13:05:06] TRADE: Direction: DIGITODD | Stake: $0.35 | Outcome: WON | Profit/Loss: +$0.34 | Balance: $10005.34
[2026-06-01 13:05:12] SESSION SUMMARY: Total Trades: 1 | Wins/Losses: 1/0 | Win Rate: 100.00% | Net Profit/Loss: +$0.34 | Balance: $10005.34
```
=======
# deriv-trading-bot
>>>>>>> 547c95b2229004c62bcf0ea4c5bf293c37ae6245
