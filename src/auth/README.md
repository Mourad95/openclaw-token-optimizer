# Authentication Module

This directory contains implementation for API key and JWT-based authentication system.

## Structure
- `auth.ts`: Main authentication logic
- `middleware.ts`: Route protection middleware
- `key-management.ts`: Key generation/rotation/revocation
- `types.ts`: Type definitions
- `tests/`: Jest test suite

## Usage
1. Import `auth.ts` into your endpoint modules
2. Use `middleware.ts` to protect routes
3. Manage keys via `key-management.ts`
4. Run tests in `tests/` directory