const axios = require('axios');
const EventEmitter = require('events');

// Virtual ledger environment
class VirtualLedger {
  constructor() {
    this.height = 0;
    this.interval = 195;
  }

  getHeight() {
    return this.height;
  }

  getInterval() {
    return this.interval;
  }

  incrementHeight(blocks) {
    this.height += blocks;
  }

  progressTime(ms) {
    const blocksToAdd = Math.floor(ms / this.interval);
    this.height += blocksToAdd;
  }
}

// Volume Analysis Market
class VolumeAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.contracts = new Map();
    this.ledger = new VirtualLedger();
    this.idGenerator = 0;
    this.timer = null;
    this.locked = false;
    
    this.feed = this.buildFeed();
    this.parser = this.buildParser();
    this.pool = this.buildPool();
    this.engine = this.buildEngine();

    this.timer = setInterval(() => {
      if (!this.locked) {
        this.locked = true;
        this.processEngine();
        this.locked = false;
      }
    }, this.ledger.getInterval());
  }

  buildFeed() {
    return {
      async fetch(url) {
        try {
          const response = await axios.get(url);
          return { code: response.status, data: response.data };
        } catch (error) {
          console.error('Feed error:', error.message);
          return { code: 500, data: null };
        }
      }
    };
  }

  buildParser() {
    return {
      extract(data, path) {
        try {
          const segments = path.split('.');
          let current = data;
          for (const seg of segments) {
            if (current && typeof current === 'object' && seg in current) {
              current = current[seg];
            } else {
              return null;
            }
          }
          if (typeof current === 'number') {
            return current;
          }
          if (typeof current === 'string') {
            const num = parseFloat(current);
            return isNaN(num) ? null : num;
          }
          return null;
        } catch (error) {
          console.error('Parser error:', error);
          return null;
        }
      }
    };
  }

  buildPool() {
    return {
      pick(capability, secure, seed, limit) {
        const pool = [
          '0xVol1...',
          '0xVol2...',
          '0xVol3...',
          '0xVol4...',
          '0xVol5...'
        ];
        const idx = (seed + this.getHeight()) % pool.length;
        return pool[idx];
      },

      getHeight() {
        return Math.floor(Date.now() / 195);
      }
    };
  }

  buildEngine() {
    const queue = new Map();
    
    return {
      queue,
      
      add(id, height, callback, maxAttempts = 3) {
        queue.set(id, {
          height,
          callback,
          attempts: 0,
          maxAttempts
        });
      },

      remove(id) {
        queue.delete(id);
      },

      process(currentHeight) {
        const ready = [];
        for (const [id, entry] of queue.entries()) {
          if (currentHeight >= entry.height && entry.attempts < entry.maxAttempts) {
            ready.push([id, entry]);
          }
        }

        for (const [id, entry] of ready) {
          entry.attempts++;
          console.log(`⏳ Processing ${id}, attempt ${entry.attempts}`);
          try {
            entry.callback(id);
            
            if (entry.attempts >= entry.maxAttempts) {
              queue.delete(id);
            } else {
              entry.height = currentHeight + 200;
            }
          } catch (error) {
            console.error(`Failed ${id}:`, error);
            if (entry.attempts >= entry.maxAttempts) {
              console.log(`❌ All attempts exhausted for ${id}`);
              queue.delete(id);
            } else {
              entry.height = currentHeight + 200;
            }
          }
        }
      }
    };
  }

  getHeight() {
    return this.ledger.getHeight();
  }

  processEngine() {
    this.ledger.incrementHeight(1);
    this.engine.process(this.getHeight());
  }

  createContract(params) {
    const { 
      asset,
      volumeType, // 'SURGE', 'DROUGHT', 'BREAKOUT'
      threshold,
      feedUrl,
      jsonPath,
      duration,
      maxAttempts = 3
    } = params;
    
    const settleAt = this.getHeight() + Math.floor(duration / (this.ledger.getInterval() / 1000));
    const contractId = `VOL_${++this.idGenerator}`;

    const contract = {
      id: contractId,
      asset,
      volumeType,
      threshold,
      feedUrl: feedUrl || 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      jsonPath: jsonPath || 'ethereum.usd',
      settleAt,
      totalYes: BigInt(0),
      totalNo: BigInt(0),
      positions: new Map(),
      status: 'ACTIVE',
      created: Date.now(),
      attempts: 0,
      maxAttempts,
      priceHistory: [],
      volumeScore: 0,
      outcome: null
    };

    this.contracts.set(contractId, contract);
    this.engine.add(contractId, settleAt, this.settleContract.bind(this), maxAttempts);

    console.log(`✅ Volume Contract ${contractId} created!`);
    console.log(`   Asset: ${asset}, Type: ${volumeType}, Threshold: ${threshold}`);
    console.log(`   Settlement at height: ${settleAt} (${duration}s)`);

    this.emit('contractCreated', contract);
    return contract;
  }

  placeBet(contractId, side, amount) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      throw new Error(`Contract ${contractId} not found`);
    }

    if (contract.status !== 'ACTIVE') {
      throw new Error(`Contract ${contractId} is not active`);
    }

    if (this.getHeight() >= contract.settleAt) {
      throw new Error(`Trading window closed`);
    }

    if (side === 'YES') {
      contract.totalYes += amount;
    } else {
      contract.totalNo += amount;
    }

    const user = `trader_${Date.now()}_${Math.random()}`;
    if (!contract.positions.has(user)) {
      contract.positions.set(user, { yes: BigInt(0), no: BigInt(0) });
    }
    const position = contract.positions.get(user);
    if (side === 'YES') {
      position.yes += amount;
    } else {
      position.no += amount;
    }

    console.log(`💰 ${amount} staked on ${side} for ${contractId}`);
    this.emit('betPlaced', { contractId, side, amount, user });
    return true;
  }

  async settleContract(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) {
      console.log(`Contract ${contractId} not found`);
      return;
    }

    if (contract.status !== 'ACTIVE') {
      console.log(`Contract ${contractId} already settled`);
      return;
    }

    console.log(`🔍 Analyzing volume for ${contractId}...`);

    try {
      const seed = Math.floor(Math.random() * 1000000);
      const executor = this.pool.pick('DATA_FETCH', true, seed, 8);
      console.log(`   Executor: ${executor}`);

      const response = await this.feed.fetch(contract.feedUrl);
      if (response.code !== 200 || !response.data) {
        throw new Error(`Feed fetch failed with code ${response.code}`);
      }
      console.log(`   Feed fetch successful`);

      const price = this.parser.extract(response.data, contract.jsonPath);
      if (price === null) {
        throw new Error(`Failed to parse price data`);
      }
      console.log(`   Current price: ${price}`);
      contract.priceHistory.push(price);

      // Analyze volume patterns
      let volumeScore = 0;
      if (contract.priceHistory.length >= 3) {
        const recent = contract.priceHistory.slice(-4);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const max = Math.max(...recent);
        const min = Math.min(...recent);
        const last = recent[recent.length - 1];
        const first = recent[0];
        
        if (contract.volumeType === 'SURGE') {
          // Large price movement
          const range = (max - min) / avg;
          const momentum = (last - first) / first;
          volumeScore = range * Math.abs(momentum);
        } else if (contract.volumeType === 'DROUGHT') {
          // Small price movement
          const range = (max - min) / avg;
          volumeScore = 1 - range;
        } else if (contract.volumeType === 'BREAKOUT') {
          // Breakout detection
          const range = (max - min) / avg;
          const momentum = (last - first) / first;
          volumeScore = range * (momentum > 0 ? 1 : -1);
        }
        contract.volumeScore = volumeScore;
        console.log(`   Volume score: ${volumeScore.toFixed(4)}`);
      }

      // Determine outcome based on volume type
      let resolved = false;
      switch (contract.volumeType) {
        case 'SURGE':
          resolved = volumeScore > contract.threshold;
          break;
        case 'DROUGHT':
          resolved = volumeScore > contract.threshold;
          break;
        case 'BREAKOUT':
          resolved = Math.abs(volumeScore) > contract.threshold;
          break;
        default:
          resolved = false;
      }

      contract.outcome = resolved ? 'YES' : 'NO';
      contract.status = 'SETTLED';

      console.log(`✅ Contract ${contractId} settled as ${contract.outcome} (score: ${volumeScore.toFixed(4)})`);

      this.engine.remove(contractId);
      this.emit('contractSettled', {
        contractId,
        outcome: contract.outcome,
        price: contract.priceHistory[contract.priceHistory.length - 1],
        volumeScore: contract.volumeScore,
        volumeType: contract.volumeType,
        threshold: contract.threshold
      });

      this.distributePayouts(contractId);

    } catch (error) {
      console.error(`❌ Settlement failed for ${contractId}:`, error.message);
      
      contract.attempts++;
      
      if (contract.attempts >= contract.maxAttempts) {
        contract.status = 'VOID';
        console.log(`⚠️ Contract ${contractId} marked VOID`);
        this.emit('contractVoid', { contractId, reason: 'Max attempts exceeded' });
        this.engine.remove(contractId);
      } else {
        console.log(`   Retry ${contract.attempts}/${contract.maxAttempts}`);
      }
    }
  }

  distributePayouts(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'SETTLED') {
      return;
    }

    const winningSide = contract.outcome;
    if (!winningSide) return;

    const winningPool = winningSide === 'YES' ? contract.totalYes : contract.totalNo;
    const totalPool = contract.totalYes + contract.totalNo;

    if (winningPool === BigInt(0)) {
      console.log(`⚠️ No winners, refunds available`);
      this.emit('refundsAvailable', { contractId });
      return;
    }

    let totalPaid = BigInt(0);
    for (const [user, position] of contract.positions.entries()) {
      const userStake = winningSide === 'YES' ? position.yes : position.no;
      if (userStake > 0) {
        const share = (userStake * totalPool) / winningPool;
        totalPaid += share;
        
        console.log(`   ${user}: ${share} RITUAL`);
        this.emit('payoutDistributed', {
          contractId,
          user,
          amount: share,
          stake: userStake
        });
      }
    }

    console.log(`📊 Total payouts: ${totalPaid} RITUAL`);
  }

  getContract(contractId) {
    return this.contracts.get(contractId);
  }

  getContracts() {
    return Array.from(this.contracts.values());
  }

  async advanceTime(seconds, waitForSettlement = true) {
    const ms = seconds * 1000;
    const blocksToAdd = Math.floor(ms / this.ledger.getInterval());
    
    console.log(`⏳ Advancing ${seconds}s (${blocksToAdd} blocks)`);
    
    for (let i = 0; i < blocksToAdd; i++) {
      this.ledger.incrementHeight(1);
      this.engine.process(this.getHeight());
      
      if (waitForSettlement) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  }

  destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

module.exports = { VolumeAnalyzer };
