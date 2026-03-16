# Contributing to OpenClaw Token Optimizer

Thank you for your interest in contributing to OpenClaw Token Optimizer! This document provides guidelines and instructions for contributing.

## 🚀 Getting Started

### Prerequisites
- Node.js 16.0 or higher
- Git
- Basic understanding of OpenClaw

### Development Setup
1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/openclaw-token-optimizer.git
   cd openclaw-token-optimizer
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run tests to ensure everything works:
   ```bash
   npm test
   ```

## 📝 Code Style

### General Guidelines
- Follow existing code style and patterns
- Write clear, descriptive commit messages
- Add tests for new features
- Update documentation when changing behavior

### JavaScript/Node.js
- Use ES6+ features where appropriate
- Add JSDoc comments for public APIs
- Handle errors gracefully
- Keep functions small and focused

### Git Commit Messages
Use the conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Example:
```
feat(vector-memory): add support for custom embedding models

- Add configuration option for embedding model
- Update documentation
- Add tests for new feature

Closes #123
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run specific test file
node scripts/test.js

# Run with coverage
npx jest --coverage
```

### Writing Tests
- Test both success and error cases
- Mock external dependencies
- Keep tests independent
- Use descriptive test names

## 📚 Documentation

### Updating Documentation
- Update README.md for user-facing changes
- Update docs/ for detailed guides
- Add JSDoc comments for API changes
- Include examples for new features

### Translation
The project supports both English and French documentation. When adding documentation:
1. Add English version first
2. Optionally add French translation
3. Keep both versions synchronized

## 🔧 Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes
- Write code
- Add tests
- Update documentation
- Run tests to ensure nothing breaks

### 3. Commit Changes
```bash
git add .
git commit -m "feat: add your feature description"
```

### 4. Push and Create PR
```bash
git push origin feature/your-feature-name
```
Then create a Pull Request on GitHub.

### 5. PR Review Process
- Ensure all tests pass
- Address review comments
- Update PR as needed
- Squash commits if requested

## 🐛 Bug Reports

When reporting bugs:
1. Check if the bug already exists in issues
2. Use the bug report template
3. Include steps to reproduce
4. Include environment details
5. Add relevant logs or error messages

## 💡 Feature Requests

When requesting features:
1. Check if the feature already exists or is planned
2. Use the feature request template
3. Explain the problem you're solving
4. Suggest implementation if possible
5. Consider backward compatibility

## 🏗️ Project Structure

```
src/
├── vector-memory.js      # Vector memory system
├── token-optimizer.js    # Token optimization logic
├── openclaw-plugin.js    # OpenClaw integration
└── index.js             # CLI interface

scripts/
├── setup.js             # Installation script
├── test.js              # Test suite
└── maintenance.js       # Maintenance utilities

docs/
├── getting-started.md   # Quick start guide
├── advanced-usage.md    # Advanced features
└── troubleshooting.md   # Common issues
```

## 🎯 Areas for Contribution

### High Priority
- Performance optimizations
- Bug fixes
- Documentation improvements
- Test coverage

### Medium Priority
- New embedding models
- Additional integrations
- UI/CLI improvements
- Monitoring features

### Low Priority
- Experimental features
- Alternative implementations
- Translation updates

## 🤝 Community

### Getting Help
- Check the documentation first
- Search existing issues
- Ask on Discord
- Create a discussion thread

### Code of Conduct
Please read and follow our [Code of Conduct](.github/CODE_OF_CONDUCT.md).

### Recognition
Contributors will be:
- Listed in the README.md
- Acknowledged in release notes
- Invited to join the maintainers team for significant contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Thank you for contributing to OpenClaw Token Optimizer! Your help makes the project better for everyone.

Happy coding! 🚀
