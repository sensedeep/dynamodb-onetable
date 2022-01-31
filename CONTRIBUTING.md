# Contribution Guidelines

All code contributions shall be made using the [MIT](https://opensource.org/licenses/MIT) license.

- [Contribution Guidelines](#contribution-guidelines)
  - [Guide](#guide)
  - [Running locally](#running-locally)

## Guide

Please ensure pull requests adheres to the following guidelines:

- Search previous pull requests before making a new one, as yours may be a duplicate.
- Make sure your code style matches existing code. Soft tabs=4, no trailing spaces etc.
- Make an individual pull request for each change. No monolithic pull requests please.
- Work constructively with project maintainers to refine your pull request if requested.

## Running locally

Contributions are encouraged via forked pull requests.

To setup the project locally run:

```bash
npm install
```

You can run the test suite locally with:

```bash
npm test
```

If you do not have Java installed, then you can run via docker with:

```bash
DOCKER=yes npm test
```

If you need to change the port, that local dynamodb runs on, then set the `PORT` environment variable.

```bash
PORT=12345 npm test
# This is also compatible with docker
DOCKER=true PORT=12344 npm test
```

You can run the linter with:

```bash
npm run lint
```
