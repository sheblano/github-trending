# Contributing

Contributions are welcome! Whether it's a bug fix, new feature, documentation improvement, or a question, feel free to open an issue or pull request.

## Getting started

1. Fork the repository and clone your fork
2. Install dependencies: `pnpm install`
3. Start the database: `docker compose up postgres -d`
4. Push the Prisma schema: `pnpm nx prisma-push backend`
5. Start both apps: `pnpm nx run-many -t serve -p frontend backend`

See [docs/run-app.md](docs/run-app.md) for full setup instructions.

## Development workflow

- Create a branch from `main` for your change
- Keep commits focused and descriptive
- Make sure the app builds and runs before submitting

## Pull requests

- Open a PR against `main`
- Describe what changed and why
- Link any related issues
- Keep PRs focused on a single concern when possible

## Reporting bugs

Open an issue with:

- Steps to reproduce
- Expected vs actual behavior
- Browser/OS/Node version if relevant
- Screenshots if applicable

## Feature requests

Open an issue describing:

- The problem you're trying to solve
- How you envision the solution
- Whether you'd be willing to implement it

## Code style

- The project uses ESLint and Prettier -- run `pnpm nx lint frontend` and `pnpm nx lint backend` before submitting
- Follow existing patterns in the codebase
- Avoid adding unnecessary dependencies

## Questions

If something is unclear, open an issue. There are no bad questions.
