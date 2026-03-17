# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Installation Problems

#### Issue: "OpenClaw not found"
**Symptoms**: Setup script fails with "OpenClaw not found" error.

**Solutions**:
```bash
# 1. Install OpenClaw globally
npm install -g openclaw

# 2. Check if OpenClaw is in PATH
which openclaw

# 3. If installed but not in PATH, add it
export PATH="$PATH:/path/to/openclaw/bin"

# 4. Verify installation
openclaw --version
```

#### Issue: "Permission denied" during setup
**Symptoms**: Setup script fails with permission errors.

**Solutions**:
```bash
# 1. Run with sudo (if appropriate)
sudo npm run setup

# 2. Fix directory permissions
sudo chown -R $(whoami) ~/.openclaw
sudo chmod 755 ~/.openclaw

# 3. Check npm permissions
npm config get prefix
# If it's /usr/local, you might need sudo
```

#### Issue: "Dependencies failed to install"
**Symptoms**: `npm install` fails with dependency errors.

**Solutions**:
```bash
# 1. Clear npm cache
npm cache clean --force

# 2. Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# 3. Reinstall
npm install

# 4. If still failing, try with legacy peer deps
npm install --legacy-peer-deps

# 5. Check Node.js version (needs >= 16)
node --version
```

### Configuration Problems

#### Issue: "Plugin not working with OpenClaw"
**Symptoms**: OpenClaw doesn't use the token optimizer for memory searches.

**Solutions**:
```bash
# 1. Check OpenClaw configuration
openclaw config get memorySearch

# 2. Verify the plugin path is correct
# The command should point to dist/src/openclaw-plugin.js (after npm run build)
cat ~/.openclaw/openclaw.json | grep -A5 memorySearch

# 3. Restart OpenClaw gateway
openclaw gateway restart

# 4. Check OpenClaw logs
openclaw gateway logs

# 5. Test the plugin directly
node dist/src/openclaw-plugin.js search "test"
```

#### Issue: "Failed to load embedding model"
**Symptoms**: Error like `Failed to load embedding model "Xenova/...": ...` and exit code 2.

**Solutions**:
```bash
# 1. Ensure network is available (first run downloads the model)
ping -c 1 huggingface.co

# 2. Check disk space
df -h .

# 3. Set cache directory if needed (e.g. writable location)
export HF_HOME=/path/to/writable/cache

# 4. Retry; subsequent runs use the cached model
node dist/src/index.js search "test"
```

#### Issue: "Invalid configuration" error
**Symptoms**: OpenClaw reports invalid configuration.

**Solutions**:
```bash
# 1. Validate JSON configuration
cat ~/.openclaw/openclaw.json | python -m json.tool

# 2. Restore from backup
cp ~/.openclaw/openclaw.json.backup* ~/.openclaw/openclaw.json

# 3. Run setup again
npm run setup

# 4. Check for syntax errors
node -c dist/src/openclaw-plugin.js
```

### Performance Problems

#### Issue: "Slow search performance"
**Symptoms**: Searches take more than 2-3 seconds.

**Solutions**:
```bash
# 1. Clear cache
openclaw-token-optimizer maintenance --clear-cache

# 2. Rebuild index
openclaw-token-optimizer index --clear

# 3. Check system resources
free -h  # Memory
df -h    # Disk space

# 4. Reduce chunk size (if memory is limited)
# Edit src/vector-memory.ts, reduce chunkSize from 500 to 300, then npm run build

# 5. Limit concurrent searches
# Set environment variable
export OPENCLAW_MAX_CONCURRENT_SEARCHES=2
```

#### Issue: "High memory usage"
**Symptoms**: Process uses too much RAM.

**Solutions**:
```bash
# 1. Reduce cache size
export OPENCLAW_CACHE_SIZE="50"

# 2. Use smaller embedding model
export OPENCLAW_EMBEDDING_MODEL="Xenova/all-MiniLM-L6-v2"

# 3. Limit index size
# Delete old memory files
find memory/ -name "*.md" -mtime +30 -delete

# 4. Clear vector index
rm -rf .vectra-index
openclaw-token-optimizer index
```

#### Issue: "Cache not working"
**Symptoms**: No cache hits reported, each search takes same time.

**Solutions**:
```bash
# 1. Check cache statistics
openclaw-token-optimizer stats

# 2. Enable debug logging
export OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true
openclaw-token-optimizer search "test"

# 3. Check cache directory permissions
ls -la .vectra-index/

# 4. Increase cache TTL
# Edit src/token-optimizer.ts, increase cacheSize, then npm run build
```

### Search Problems

#### Issue: "No results found"
**Symptoms**: Searches return empty context.

**Solutions**:
```bash
# 1. Check if memory files exist
ls -la memory/

# 2. Index memory files
openclaw-token-optimizer index

# 3. Check index statistics
openclaw-token-optimizer stats

# 4. Lower relevance threshold
export OPENCLAW_MIN_RELEVANCE_SCORE="0.1"
openclaw-token-optimizer search "query"

# 5. Add test memory
echo "Test memory for troubleshooting" > memory/test.md
openclaw-token-optimizer index
openclaw-token-optimizer search "test"
```

#### Issue: "Irrelevant results"
**Symptoms**: Search returns unrelated context.

**Solutions**:
```bash
# 1. Increase relevance threshold
export OPENCLAW_MIN_RELEVANCE_SCORE="0.5"

# 2. Improve memory file quality
# Use clear, descriptive text in memory files
# Add relevant keywords

# 3. Reindex with better chunking
# Edit src/vector-memory.ts, adjust chunkSize and overlap, then npm run build

# 4. Use more specific queries
```

#### Issue: "Duplicate results"
**Symptoms**: Same content appears multiple times.

**Solutions**:
```bash
# 1. Check duplicate removal statistics
openclaw-token-optimizer search "query" -v

# 2. Clean up memory files
# Remove duplicate content from memory files

# 3. Increase duplicate detection sensitivity
# Edit src/token-optimizer.ts, adjust duplicate detection logic, then npm run build
```

### Token Optimization Problems

#### Issue: "Low token savings"
**Symptoms**: Token savings less than 50%.

**Solutions**:
```bash
# 1. Analyze current savings
openclaw-token-optimizer analyze

# 2. Add more memory files
# More files = better optimization potential

# 3. Increase maxContextLength
export OPENCLAW_MAX_CONTEXT_LENGTH="3000"

# 4. Check memory file sizes
find memory/ -name "*.md" -exec wc -c {} \;

# 5. Consider compressing memory files
# Remove unnecessary content
```

#### Issue: "Context too short"
**Symptoms**: Optimized context is truncated.

**Solutions**:
```bash
# 1. Increase max context length
export OPENCLAW_MAX_CONTEXT_LENGTH="4000"

# 2. Increase max tokens
export OPENCLAW_MAX_TOKENS="2000"

# 3. Check token estimation
openclaw-token-optimizer search "query" -v
# Look at "estimatedTokens" vs "potentialTokens"

# 4. Adjust chunk size
# Smaller chunks = more granular context selection
```

### Vector Memory Problems

#### Issue: "Embedding model fails to load"
**Symptoms**: Error loading Xenova/transformers model.

**Solutions**:
```bash
# 1. Clear transformers cache
rm -rf ~/.cache/huggingface/hub
rm -rf node_modules/@xenova/transformers

# 2. Reinstall dependencies
npm install

# 3. Use smaller model
export OPENCLAW_EMBEDDING_MODEL="Xenova/all-MiniLM-L6-v2"

# 4. Check internet connection (for first download)
ping huggingface.co

# 5. Manual download
python -c "from transformers import pipeline; pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')"
```

#### Issue: "Vector index corrupted"
**Symptoms**: Errors reading from .vectra-index directory.

**Solutions**:
```bash
# 1. Delete and rebuild index
rm -rf .vectra-index
openclaw-token-optimizer index

# 2. Check disk space
df -h .

# 3. Check file permissions
ls -la .vectra-index/

# 4. Run filesystem check
fsck /dev/your-disk

# 5. Use different index location
export OPENCLAW_INDEX_PATH="/tmp/.vectra-index"
```

#### Issue: "Indexing takes too long"
**Symptoms**: Indexing large memory files is slow.

**Solutions**:
```bash
# 1. Process in batches
# Split large memory files into smaller ones

# 2. Increase chunk size
# Edit src/vector-memory.ts, increase chunkSize to 1000, then npm run build

# 3. Skip indexing of old files
find memory/ -name "*.md" -mtime -7 | xargs cat | # process only recent files

# 4. Use incremental indexing
# Manually index only new files
```

### Logging and Debugging

#### Issue: "No logs generated"
**Symptoms**: Logs directory is empty.

**Solutions**:
```bash
# 1. Check logs directory permissions
ls -la logs/
chmod 755 logs/

# 2. Enable debug mode
export OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true

# 3. Check if logging is enabled in code
# Enable debug logs: OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true (see src/logger.ts)

# 4. Redirect output to file
openclaw-token-optimizer search "query" 2>&1 | tee debug.log

# 5. Check Node.js version compatibility
node --version
```

#### Issue: "Error messages not helpful"
**Symptoms**: Generic error messages without details.

**Solutions**:
```bash
# 1. Enable verbose mode
openclaw-token-optimizer search "query" -v

# 2. Check Node.js error stack
NODE_DEBUG=module node dist/src/index.js search "query"

# 3. Add custom error handling
# Edit src files to add more detailed error messages

# 4. Check system logs
dmesg | tail -20
journalctl -xe
```

### Integration Problems

#### Issue: "OpenClaw gateway won't start"
**Symptoms**: OpenClaw gateway fails after configuration.

**Solutions**:
```bash
# 1. Check OpenClaw configuration
openclaw config validate

# 2. Restore original configuration
cp ~/.openclaw/openclaw.json.backup* ~/.openclaw/openclaw.json
openclaw gateway restart

# 3. Check OpenClaw version compatibility
openclaw --version
# Needs 2026.3.0 or higher

# 4. Check plugin compatibility
node dist/src/openclaw-plugin.js --version

# 5. Run OpenClaw in debug mode
openclaw gateway start --debug
```

#### Issue: "Plugin times out"
**Symptoms**: OpenClaw reports timeout when calling plugin.

**Solutions**:
```bash
# 1. Increase timeout in OpenClaw config
# Edit ~/.openclaw/openclaw.json, add "timeout": 10000

# 2. Optimize plugin performance
# Follow performance troubleshooting steps

# 3. Check for infinite loops
# Review plugin code for potential loops

# 4. Test plugin directly with timeout
timeout 5 node dist/src/openclaw-plugin.js search "test"
```

#### Issue: "Memory leaks"
**Symptoms**: Memory usage grows over time.

**Solutions**:
```bash
# 1. Monitor memory usage
watch -n 1 'ps aux | grep node | grep -v grep'

# 2. Enable garbage collection logging
node --expose-gc dist/src/index.js search "query"

# 3. Check for circular references
# Use heap dump analysis

# 4. Implement memory limits
export NODE_OPTIONS="--max-old-space-size=512"
```

### CLI exit codes

When running the CLI or plugin directly, exit codes are:

- **0** — Success
- **1** — General error (e.g. invalid args, search failure)
- **2** — Model/embedding load failed (network, disk, or invalid model); check connectivity and retry

## 🔧 Diagnostic Tools

### Health Check Script

Create a diagnostic script:

```bash
#!/bin/bash
echo "=== OpenClaw Token Optimizer Diagnostics ==="
echo "Timestamp: $(date)"
echo ""

echo "1. System Information:"
echo "   Node.js: $(node --version)"
echo "   npm: $(npm --version)"
echo "   OpenClaw: $(openclaw --version 2>/dev/null || echo 'Not found')"
echo ""

echo "2. Directory Structure:"
ls -la
echo ""

echo "3. Memory Files:"
find memory/ -name "*.md" -exec wc -l {} \; 2>/dev/null || echo "No memory directory"
echo ""

echo "4. Vector Index:"
du -sh .vectra-index 2>/dev/null || echo "No vector index"
echo ""

echo "5. Plugin Test:"
node dist/src/openclaw-plugin.js search "diagnostic" 2>&1 | tail -5
echo ""

echo "6. OpenClaw Configuration:"
openclaw config get memorySearch 2>/dev/null || echo "Cannot read config"
echo ""

echo "=== End Diagnostics ==="
```

### Performance Benchmark

Run performance tests:

```bash
#!/bin/bash
echo "Running performance benchmarks..."
echo ""

echo "1. Cold search (no cache):"
time node dist/src/openclaw-plugin.js search "benchmark test 1" > /dev/null
echo ""

echo "2. Warm search (cached):"
time node dist/src/openclaw-plugin.js search "benchmark test 1" > /dev/null
echo ""

echo "3. Multiple searches:"
for i in {1..5}; do
  echo "  Search $i:"
  time node dist/src/openclaw-plugin.js search "benchmark test $i" > /dev/null
done
echo ""

echo "4. Indexing test:"
time node dist/src/index.js index > /dev/null
```

### Log Analysis

Analyze logs for patterns:

```bash
# Count errors by type
grep -i "error\|fail\|warn" logs/*.log | cut -d' ' -f4- | sort | uniq -c | sort -rn

# Search for specific patterns
grep -n "timeout\|slow\|memory" logs/*.log

# Monitor real-time logs
tail -f logs/optimization.log | grep -E "(error|warning|savings)"

# Generate log summary
awk '/savings/ {sum+=$NF; count++} END {print "Average savings:", sum/count "%"}' logs/*.log
```

## 📞 Getting Help

### When to Ask for Help

Contact support or open an issue when:

1. **Critical functionality broken**: Plugin doesn't work at all
2. **Data loss**: Memory files or index corrupted
3. **Security issues**: Suspected vulnerabilities
4. **Performance degradation**: Sudden slowdown without cause
5. **Integration failures**: Can't integrate with OpenClaw

### Information to Provide

When reporting issues, include:

1. **Error messages**: Complete error output
2. **Environment**: OS, Node.js version, OpenClaw version
3. **Steps to reproduce**: Exact commands that caused the issue
4. **Log files**: Relevant log entries
5. **Configuration**: OpenClaw config and plugin settings
6. **Expected vs actual**: What you expected vs what happened

### Community Resources

- **GitHub Issues**: Report bugs and request features
- **OpenClaw Discord**: Get community support
- **Documentation**: Check docs/ directory
- **Examples**: Review examples/ for working configurations
- **Stack Overflow**: Tag with `openclaw` and `token-optimizer`

## 🛡️ Preventive Maintenance

### Regular Maintenance Schedule

```bash
# Daily (optional)
openclaw-token-optimizer stats

# Weekly (recommended)
openclaw-token-optimizer maintenance
openclaw-token-optimizer analyze

# Monthly
openclaw-token-optimizer index --clear
rm -rf logs/*.log.*  # Clean up old logs

# Quarterly
# Review memory files, remove outdated content
# Update dependencies: npm update
# Backup vector index: cp -r .vectra-index backup/
```

### Monitoring Script

Create a monitoring script:

```bash
#!/bin/bash
# monitor.sh - Daily monitoring script

LOG_FILE="logs/monitor-$(date +%Y-%m-%d).log"

{
  echo "=== Daily Monitor $(date) ==="
  
  # Check system health
  echo "1. System Resources:"
  free -h | grep Mem
  df -h . | grep -v Filesystem
  
  # Check plugin health
  echo "2. Plugin Health:"
  node dist/src/openclaw-plugin.js stats 2>&1 | grep -A5 "=== PERFORMANCE ==="
  
  # Check token savings
  echo "3. Token Savings:"
  node dist/src/openclaw-plugin.js analyze 2>&1 | grep -A3 "=== TOKEN SAVINGS ANALYSIS ==="
  
  # Check for errors
  echo "4. Recent Errors:"
  grep -i error logs/*.log 2>/dev/null | tail -5 || echo "No errors found"
  
  echo "=== End Report ==="
} > "$LOG_FILE"

echo "Report saved to $LOG_FILE"
```

### Backup Strategy

```bash
#!/bin/bash
# backup.sh - Backup important data

BACKUP_DIR="backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup memory files
cp -r memory/ "$BACKUP_DIR/memory"

# Backup vector index
cp -r .vectra-index/ "$BACKUP_DIR/vectra-index"

# Backup configuration
cp ~/.openclaw/openclaw.json "$BACKUP_DIR/openclaw-config.json"

# Backup logs
cp -r logs/ "$BACKUP_DIR/logs"

# Create archive
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"

echo "Backup created: $BACKUP_DIR.tar.gz"
```

Remember: Regular maintenance prevents most issues. When in doubt,