# Getting Started with OpenClaw Token Optimizer

## 🚀 Quick Start Guide

Welcome to OpenClaw Token Optimizer! This guide will help you get started with reducing your OpenClaw token consumption by 70-90%.

### Prerequisites

- **Node.js** 16.0 or higher
- **OpenClaw** 2026.3.0 or higher
- **npm** 7.0 or higher

### Installation

#### Option 1: Install from GitHub (Recommended)

```bash
# Clone the repository
git clone https://github.com/openclaw-community/openclaw-token-optimizer.git
cd openclaw-token-optimizer

# Install dependencies
npm install

# Run setup
npm run setup
```

#### Option 2: Install as Global Tool

```bash
# Install globally
npm install -g openclaw-token-optimizer

# Run setup
openclaw-token-optimizer setup
```

#### Option 3: Use as npm Script

```bash
# Add to your project
npm install openclaw-token-optimizer --save-dev

# Add to package.json scripts
{
  "scripts": {
    "optimize-tokens": "openclaw-token-optimizer"
  }
}
```

### Basic Configuration

The setup script automatically configures OpenClaw to use the token optimizer. It updates your OpenClaw configuration file (`~/.openclaw/openclaw.json`) with:

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "custom",
        "command": "node /path/to/openclaw-token-optimizer/src/openclaw-plugin.js memory-search",
        "maxResults": 5,
        "maxTokens": 1000
      }
    }
  }
}
```

### Verify Installation

1. **Restart OpenClaw**:
   ```bash
   openclaw gateway restart
   ```

2. **Check OpenClaw status**:
   ```bash
   openclaw status
   ```

3. **Test the optimizer**:
   ```bash
   node src/index.js search "test query"
   ```

### Your First Optimization

#### Step 1: Add Memory Files

Create memory files in the `memory/` directory:

```bash
# Create a memory file
echo "# Project Notes\n\nWorking on token optimization project." > memory/2025-03-16.md

# Add another file
echo "# User Preferences\n\nPrefers technical explanations in French." > memory/preferences.md
```

#### Step 2: Index the Memory

```bash
# Index all memory files
npm run index

# Or use the CLI
openclaw-token-optimizer index
```

#### Step 3: Test Search

```bash
# Search for relevant context
openclaw-token-optimizer search "token optimization"

# You should see optimized context with token savings
```

#### Step 4: Use with OpenClaw

Now when you use OpenClaw, it will automatically use the token optimizer for memory searches. You'll see reduced token consumption in your OpenClaw sessions.

### Basic Commands

| Command | Description | Example |
|---------|-------------|---------|
| `search` | Search for optimized context | `openclaw-token-optimizer search "my query"` |
| `index` | Index memory files | `openclaw-token-optimizer index` |
| `analyze` | Analyze token savings | `openclaw-token-optimizer analyze` |
| `stats` | Get plugin statistics | `openclaw-token-optimizer stats` |
| `maintenance` | Run maintenance tasks | `openclaw-token-optimizer maintenance` |

### Directory Structure

After installation, you'll have:

```
openclaw-token-optimizer/
├── memory/           # Your memory files (.md format)
├── logs/             # Logs and reports
├── .vectra-index/    # Vector database (auto-created)
├── src/              # Source code
├── scripts/          # Utility scripts
└── docs/             # Documentation
```

### Memory File Format

Memory files should be in Markdown format:

```markdown
# Title or Date

## Section 1
Content here...

## Section 2
More content...

- Bullet points work too
- Use clear, descriptive text
```

Best practices:
- One file per day or per topic
- Use clear headings
- Keep paragraphs concise
- Include dates in filenames (YYYY-MM-DD.md)

### Testing Your Setup

Run the comprehensive test suite:

```bash
npm test
```

Or test individual components:

```bash
# Test plugin initialization
node scripts/test.js

# Test search functionality
node src/index.js search "test"

# Test token savings analysis
node src/index.js analyze
```

### Troubleshooting

#### Common Issues

1. **"OpenClaw not found"**
   ```bash
   # Install OpenClaw first
   npm install -g openclaw
   ```

2. **"Plugin not working"**
   ```bash
   # Restart OpenClaw
   openclaw gateway restart
   
   # Check configuration
   openclaw config get memorySearch
   ```

3. **"Slow performance"**
   ```bash
   # Clear cache
   openclaw-token-optimizer maintenance --clear-cache
   
   # Rebuild index
   openclaw-token-optimizer index --clear
   ```

4. **"No memory files found"**
   ```bash
   # Create memory directory
   mkdir -p memory
   
   # Add some files
   echo "# Test Memory" > memory/test.md
   
   # Index them
   openclaw-token-optimizer index
   ```

#### Debug Mode

Enable verbose logging:

```bash
# Set debug environment variable
export OPENCLAW_TOKEN_OPTIMIZER_DEBUG=true

# Run with debug output
node src/index.js search "query" -v
```

### Next Steps

Once you have the basics working:

1. **Add your existing memory files** to the `memory/` directory
2. **Run regular maintenance** (weekly recommended)
3. **Monitor token savings** with `openclaw-token-optimizer analyze`
4. **Explore advanced features** in the [Advanced Usage](advanced-usage.md) guide
5. **Customize settings** for your specific needs

### Getting Help

- **Documentation**: Check the `docs/` directory
- **Examples**: Look at `examples/` for integration patterns
- **Issues**: Report problems on GitHub
- **Community**: Join the OpenClaw Discord for support

### Quick Reference Card

```bash
# Installation
git clone <repo> && cd openclaw-token-optimizer && npm install && npm run setup

# Daily use
openclaw-token-optimizer search "your query"
openclaw-token-optimizer add "user question" "assistant answer"

# Maintenance (weekly)
openclaw-token-optimizer maintenance
openclaw-token-optimizer analyze

# Monitoring
openclaw-token-optimizer stats
tail -f logs/optimization.log
```

Congratulations! You're now ready to save 70-90% on OpenClaw token consumption. 🎉

---

**Next**: Check out [Advanced Usage](advanced-usage.md) for customization options and integration patterns.
