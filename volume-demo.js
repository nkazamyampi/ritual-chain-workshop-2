const { VolumeAnalyzer } = require('./volume-analyzer');

async function main() {
  console.log('🚀 Volume Analysis Market Demo\n');

  const analyzer = new VolumeAnalyzer();

  analyzer.on('contractCreated', (c) => {
    console.log(`📋 Contract created: ${c.id}\n`);
  });

  analyzer.on('betPlaced', ({ contractId, side, amount }) => {
    console.log(`💰 ${amount} on ${side} for ${contractId}\n`);
  });

  analyzer.on('contractSettled', ({ contractId, outcome, price, volumeScore, volumeType, threshold }) => {
    console.log(`🎯 ${contractId} settled as ${outcome}!`);
    console.log(`   Price: ${price}`);
    console.log(`   Volume Score: ${volumeScore ? volumeScore.toFixed(4) : 'N/A'}`);
    console.log(`   Type: ${volumeType}, Threshold: ${threshold}\n`);
  });

  analyzer.on('payoutDistributed', ({ contractId, user, amount }) => {
    console.log(`💸 ${amount} to ${user} for ${contractId}`);
  });

  // Contract 1: Volume Surge ETH
  console.log('=== Contract 1: ETH - Volume Surge > 0.05 ===');
  const c1 = analyzer.createContract({
    asset: 'ETH',
    volumeType: 'SURGE',
    threshold: 0.05,
    feedUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    jsonPath: 'ethereum.usd',
    duration: 5,
    maxAttempts: 3
  });

  analyzer.placeBet(c1.id, 'YES', BigInt(200));
  analyzer.placeBet(c1.id, 'NO', BigInt(150));

  // Contract 2: Volume Drought BTC
  console.log('\n=== Contract 2: BTC - Volume Drought > 0.7 ===');
  const c2 = analyzer.createContract({
    asset: 'BTC',
    volumeType: 'DROUGHT',
    threshold: 0.7,
    feedUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
    jsonPath: 'bitcoin.usd',
    duration: 3,
    maxAttempts: 2
  });

  analyzer.placeBet(c2.id, 'YES', BigInt(100));
  analyzer.placeBet(c2.id, 'NO', BigInt(200));

  // Contract 3: Breakout SOL
  console.log('\n=== Contract 3: SOL - Breakout Volume > 0.04 ===');
  const c3 = analyzer.createContract({
    asset: 'SOL',
    volumeType: 'BREAKOUT',
    threshold: 0.04,
    feedUrl: 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    jsonPath: 'solana.usd',
    duration: 4,
    maxAttempts: 3
  });

  analyzer.placeBet(c3.id, 'YES', BigInt(80));
  analyzer.placeBet(c3.id, 'NO', BigInt(40));

  console.log('\n=== Settling contracts ===');
  await analyzer.advanceTime(6);

  console.log('\n=== All Contracts ===');
  analyzer.getContracts().forEach(c => {
    console.log(`${c.id}: ${c.status}`);
    console.log(`  YES: ${c.totalYes}, NO: ${c.totalNo}`);
    console.log(`  Outcome: ${c.outcome || 'Pending'}`);
    console.log(`  Volume Score: ${c.volumeScore ? c.volumeScore.toFixed(4) : 'N/A'}`);
    console.log('---');
  });

  analyzer.destroy();
  console.log('\n✅ Volume Demo complete!');
}

main().catch(console.error);
