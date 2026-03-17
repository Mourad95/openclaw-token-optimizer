# Advanced Usage Guide

## 🎛️ Configuration Options

### Customizing the Token Optimizer

You can customize the Token Optimizer by passing options to the constructor:

```javascript
const { TokenOptimizer } = require('openclaw-token-optimizer');

const optimizer = new TokenOptimizer({
  // Token limits
  maxContextLength: 1500,    // Maximum characters in context (default: 2000)
  maxTokens: 800,            // Target token limit (default: 1000)
  
  // Search settings
  minRelevanceScore: 0.4,    // Minimum similarity score (default: 0.3)
  cacheSize: 200,            // Query cache size (default: 100)
  
  // Vector memory settings
  vectorMemory: {
    embeddingModel: 'Xenova/all-mpnet-base-v2',  // Alternative model
    chunkSize: 800,          // Characters per chunk (default: 500)
    overlap: 100,            // Overlap between chunks (default: 50)
    indexPath: '/custom/path/.vectra-index'  // Custom index location
  }
});
```

### Environment Variables

```bash
# Custom memory directory
export OPENCLAW_MEMORY_DIR="/path/to/your/memory"

# Custom workspace
export OPENCLAW_WORKSPACE="/path/to/workspace"

# Debug mode
export OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true

# Alternative embedding model
export OPENCLAW_EMBEDDING_MODEL="Xenova/all-mpnet-base-v2"

# Cache settings
export OPENCLAW_CACHE_SIZE="500"
export OPENCLAW_MAX_CONTEXT_LENGTH="3000"
```

### Configuration Files

Create a `config.json` file in your project root:

```json
{
  "tokenOptimizer": {
    "maxContextLength": 2500,
    "maxTokens": 1200,
    "cacheSize": 300,
    "vectorMemory": {
      "chunkSize": 600,
      "overlap": 75,
      "embeddingModel": "Xenova/all-MiniLM-L6-v2"
    }
  },
  "memory": {
    "directory": "./my-memories",
    "autoIndex": true,
    "indexInterval": 3600000
  },
  "logging": {
    "level": "info",
    "directory": "./logs",
    "maxFiles": 10
  }
}
```

Load configuration:

```javascript
const config = require('./config.json');
const optimizer = new TokenOptimizer(config.tokenOptimizer);
```

## 🔌 Integration Patterns

### Integration with OpenClaw Agents

Create a custom agent configuration that uses the token optimizer:

```json
{
  "id": "optimized-agent",
  "model": "deepseek/deepseek-chat",
  "instructions": "Use the token-optimized memory search for context.",
  "tools": ["exec", "read", "write", "web_search"],
  "memorySearch": {
    "enabled": true,
    "provider": "custom",
    "command": "node /path/to/openclaw-token-optimizer/dist/src/openclaw-plugin.js memory-search",
    "maxResults": 7,
    "maxTokens": 1500
  }
}
```

### Batch Processing

Process multiple queries efficiently:

```javascript
const { TokenOptimizer } = require('openclaw-token-optimizer');

async function batchProcess(queries) {
  const optimizer = new TokenOptimizer();
  await optimizer.initialize();
  
  const results = [];
  
  for (const query of queries) {
    const context = await optimizer.getOptimizedContext(query, 3);
    results.push({
      query,
      context: context.context,
      tokens: context.stats.estimatedTokens,
      savings: context.stats.savingsPercent
    });
  }
  
  return results;
}

// Usage
const queries = [
  "project status",
  "user preferences",
  "recent decisions"
];

batchProcess(queries).then(console.log);
```

### Real-time Monitoring

Monitor token savings in real-time:

```javascript
const { OpenClawTokenOptimizerPlugin } = require('openclaw-token-optimizer');

class TokenMonitor {
  constructor() {
    this.plugin = new OpenClawTokenOptimizerPlugin();
    this.metrics = {
      totalQueries: 0,
      totalTokensSaved: 0,
      averageSavings: 0
    };
  }
  
  async startMonitoring() {
    await this.plugin.initialize();
    
    // Monitor every 5 minutes
    setInterval(() => this.collectMetrics(), 5 * 60 * 1000);
    
    // Log significant events
    this.plugin.optimizer.on('cacheHit', this.logCacheHit.bind(this));
    this.plugin.optimizer.on('tokenSaved', this.logTokenSave.bind(this));
  }
  
  async collectMetrics() {
    const stats = await this.plugin.getStats();
    const analysis = await this.plugin.analyzeSavings();
    
    this.metrics = {
      totalQueries: stats.performance.queries,
      totalTokensSaved: stats.performance.tokensSaved,
      averageSavings: analysis.analysis?.savingsPercent || 0,
      cacheHitRate: stats.performance.cacheHitRate,
      timestamp: new Date().toISOString()
    };
    
    this.saveMetrics();
  }
  
  saveMetrics() {
    // Save to database or file
    const fs = require('fs');
    const metricsFile = 'logs/metrics.jsonl';
    fs.appendFileSync(metricsFile, JSON.stringify(this.metrics) + '\n');
  }
}
```

## 🧠 Advanced Memory Management

### Custom Memory Sources

Integrate with different memory sources:

```javascript
const { VectorMemory } = require('openclaw-token-optimizer/dist/src/vector-memory');

class CustomMemoryManager {
  constructor() {
    this.vectorMemory = new VectorMemory();
    this.sources = [];
  }
  
  async addSource(source) {
    this.sources.push(source);
    await this.indexSource(source);
  }
  
  async indexSource(source) {
    switch (source.type) {
      case 'database':
        await this.indexDatabase(source);
        break;
      case 'api':
        await this.indexAPI(source);
        break;
      case 'filesystem':
        await this.indexFilesystem(source);
        break;
    }
  }
  
  async indexDatabase(source) {
    // Connect to database and index records
    const records = await source.getRecords();
    
    for (const record of records) {
      await this.vectorMemory.addMemory(record.text, {
        source: 'database',
        table: source.table,
        recordId: record.id,
        timestamp: record.created_at
      });
    }
  }
  
  async searchAllSources(query, limit = 5) {
    const results = [];
    
    // Search vector memory
    const vectorResults = await this.vectorMemory.searchMemories(query, limit);
    results.push(...vectorResults);
    
    // Search other sources if needed
    for (const source of this.sources) {
      if (source.supportsSearch) {
        const sourceResults = await source.search(query, Math.floor(limit / 2));
        results.push(...sourceResults);
      }
    }
    
    // Deduplicate and sort
    return this.deduplicateResults(results).slice(0, limit);
  }
}
```

### Memory Prioritization

Prioritize certain memories over others:

```javascript
class PriorityMemory extends VectorMemory {
  constructor() {
    super();
    this.priorityWeights = {
      'conversation': 1.0,
      'documentation': 0.8,
      'code': 0.7,
      'notes': 0.6,
      'archived': 0.3
    };
  }
  
  async addMemory(text, metadata = {}) {
    // Calculate priority score
    const priority = this.calculatePriority(metadata);
    const weightedText = `[Priority: ${priority}] ${text}`;
    
    return super.addMemory(weightedText, {
      ...metadata,
      priority,
      originalText: text
    });
  }
  
  calculatePriority(metadata) {
    let score = 1.0;
    
    // Type-based priority
    if (metadata.type && this.priorityWeights[metadata.type]) {
      score *= this.priorityWeights[metadata.type];
    }
    
    // Recency bonus (last 7 days)
    if (metadata.timestamp) {
      const ageDays = (Date.now() - new Date(metadata.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < 7) {
        score *= 1.2;
      }
    }
    
    // Importance flag
    if (metadata.important) {
      score *= 1.5;
    }
    
    return Math.min(score, 2.0); // Cap at 2.0
  }
}
```

## ⚡ Performance Optimization

### Cache Strategies

Implement advanced caching:

```javascript
const NodeCache = require('node-cache');

class AdvancedCache {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 3600, // 1 hour
      checkperiod: 600, // 10 minutes
      useClones: false
    });
    
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0
    };
  }
  
  async getOrSet(key, fetchFn, ttl = 3600) {
    const cached = this.cache.get(key);
    
    if (cached) {
      this.stats.hits++;
      return cached;
    }
    
    this.stats.misses++;
    const value = await fetchFn();
    
    this.cache.set(key, value, ttl);
    this.stats.size = this.cache.keys().length;
    
    return value;
  }
  
  // Pre-warm cache with common queries
  async prewarm(queries) {
    for (const query of queries) {
      const key = this.generateKey(query);
      if (!this.cache.has(key)) {
        // Fetch and cache in background
        this.getOrSet(key, () => this.fetchQuery(query));
      }
    }
  }
  
  // Cache invalidation strategies
  invalidateByPattern(pattern) {
    const keys = this.cache.keys();
    const regex = new RegExp(pattern);
    
    keys.forEach(key => {
      if (regex.test(key)) {
        this.cache.del(key);
      }
    });
  }
}
```

### Parallel Processing

Process multiple operations in parallel:

```javascript
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

class ParallelProcessor {
  constructor(numWorkers = 4) {
    this.numWorkers = numWorkers;
    this.workers = [];
  }
  
  async processBatch(queries) {
    const chunkSize = Math.ceil(queries.length / this.numWorkers);
    const chunks = [];
    
    for (let i = 0; i < queries.length; i += chunkSize) {
      chunks.push(queries.slice(i, i + chunkSize));
    }
    
    const workerPromises = chunks.map((chunk, index) => {
      return this.processWithWorker(chunk, index);
    });
    
    const results = await Promise.all(workerPromises);
    return results.flat();
  }
  
  processWithWorker(queries, workerId) {
    return new Promise((resolve, reject) => {
      const worker = new Worker('./worker.js', {
        workerData: { queries, workerId }
      });
      
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }
}

// worker.js
if (!isMainThread) {
  const { TokenOptimizer } = require('openclaw-token-optimizer');
  const optimizer = new TokenOptimizer();
  
  (async () => {
    await optimizer.initialize();
    const results = [];
    
    for (const query of workerData.queries) {
      const context = await optimizer.getOptimizedContext(query, 3);
      results.push({
        query,
        workerId: workerData.workerId,
        contextLength: context.context.length,
        tokens: context.stats.estimatedTokens
      });
    }
    
    parentPort.postMessage(results);
  })();
}
```

## 📊 Analytics and Monitoring

### Custom Analytics Dashboard

Create a dashboard to monitor token savings:

```javascript
const express = require('express');
const { OpenClawTokenOptimizerPlugin } = require('openclaw-token-optimizer');

class AnalyticsDashboard {
  constructor(port = 3000) {
    this.app = express();
    this.plugin = new OpenClawTokenOptimizerPlugin();
    this.port = port;
    
    this.setupRoutes();
  }
  
  async start() {
    await this.plugin.initialize();
    this.app.listen(this.port, () => {
      console.log(`Dashboard running on http://localhost:${this.port}`);
    });
  }
  
  setupRoutes() {
    // Main dashboard
    this.app.get('/', async (req, res) => {
      const stats = await this.plugin.getStats();
      const analysis = await this.plugin.analyzeSavings();
      
      res.send(`
        <html>
          <head><title>Token Optimizer Dashboard</title></head>
          <body>
            <h1>Token Optimizer Dashboard</h1>
            <div>
              <h2>Statistics</h2>
              <p>Total Queries: ${stats.performance.queries}</p>
              <p>Cache Hit Rate: ${stats.performance.cacheHitRate}</p>
              <p>Total Tokens Saved: ${stats.performance.tokensSaved}</p>
              <p>Token Savings: ${analysis.analysis?.savingsPercent || 0}%</p>
            </div>
          </body>
        </html>
      `);
    });
    
    // JSON API
    this.app.get('/api/stats', async (req, res) => {
      const stats = await this.plugin.getStats();
      res.json(stats);
    });
    
    this.app.get('/api/analysis', async (req, res) => {
      const analysis = await this.plugin.analyzeSavings();
      res.json(analysis);
    });
    
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        await this.plugin.initialize();
        res.json({ status: 'healthy', timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(500).json({ status: 'unhealthy', error: error.message });
      }
    });
  }
}
```

### Export and Import

Export and import vector memories:

```javascript
class MemoryExporter {
  constructor() {
    this.vectorMemory = new VectorMemory();
  }
  
  async exportMemories(format = 'json', options = {}) {
    await this.vectorMemory.initialize();
    
    const memories = await this.vectorMemory.exportMemories(options.limit);
    
    switch (format) {
      case 'json':
        return this.exportJSON(memories, options);
      case 'csv':
        return this.exportCSV(memories, options);
      case 'markdown':
        return this.exportMarkdown(memories, options);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }
  
  exportJSON(memories, options) {
    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      count: memories.count,
      memories: memories.memories.map(m => ({
        id: m.id,
        text: m.text,
        metadata: m.metadata,
        score: m.score
      }))
    };
    
    if (options.pretty) {
      return JSON.stringify(exportData, null, 2);
    }
    
    return JSON.stringify(exportData);
  }
  
  async importMemories(filePath, format = 'json') {
    const fs = require('fs');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    let memories;
    
    switch (format) {
      case 'json':
        memories = JSON.parse(content);
        break;
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
    
    let imported = 0;
    
    for (const memory of memories.memories || []) {
      await this.vectorMemory.addMemory(memory.text, memory.metadata);
      imported++;
    }
    
    return { imported, total: memories.count || memories.memories?.length || 0 };
  }
}
```

## 🔒 Security Considerations

### Secure Configuration

```javascript
const crypto = require('crypto');

class SecureTokenOptimizer extends TokenOptimizer {
  constructor(options = {}) {
    super(options);
    this.encryptionKey = options.encryptionKey || process.env.ENCRYPTION_KEY;
  }
  
  async addSecureMemory(text, metadata = {}) {
    const encryptedText = this.encrypt(text);
    const encryptedMetadata = this.encrypt(JSON.stringify(metadata));
    
    return super.addMemory(encryptedText, {
      ...metadata,
      encrypted: true,
      encryptedMetadata
    });
  }
  
  async searchSecureMemories(query, limit = 5) {
    const results = await super.searchMemories(query, limit);
    
    return results.map(result => {
      if (result.metadata.encrypted) {
        return {
          ...result,
          text: this.decrypt(result.text),
          metadata: JSON.parse(this.decrypt(result.metadata.encryptedMetadata))
        };
      }
      return result;
    });
  }
  
  encrypt(text) {
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }
  
  decrypt(encrypted) {
    const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
```

### Access Control