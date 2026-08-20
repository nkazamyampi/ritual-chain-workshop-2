# Volume Analysis Market

A self-resolving prediction market that analyzes **price volume and movement patterns**.

## Distinctive Features

- **Volume Analysis**: Detects surges, droughts, and breakouts
- **Three Volume Types**: Surge, Drought, and Breakout
- **Price Movement Analysis**: Tracks price range and momentum
- **Threshold-Based Detection**: Configurable volume thresholds

## How Volume Analysis Works

1. Each contract tracks price movements over time
2. Volume score is calculated from price range and momentum
3. Surge: score > threshold, Drought: score > threshold, Breakout: |score| > threshold
4. Contracts settle based on the detected volume pattern

## Contracts

- ETH - Volume Surge > 0.05
- BTC - Volume Drought > 0.7
- SOL - Breakout Volume > 0.04

## Installation

npm install
npm start

## License

MIT
