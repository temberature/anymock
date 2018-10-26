# Setup

At anymock we use `npm` to execute commands.

If you already have `npm` installed, do: `npm run setup`. This will complete all required steps.

That's all.

## Setup manually

### Setup your local anymock repository

```bash
git clone https://github.com/temberature/anymock.git
cd anymock
npm install
```

### To run the entire test suite use

```bash
npm test
```

### To run only integration tests use

```bash
npm test:integration
```

or in watch mode

```bash
npm test:integration --watch
```

### To run only unit tests use

```bash
npm test:unit
```

or in watch mode

```bash
npm test:unit --watch
```

### To update Jest snapshots use

```bash
npm test:update-snapshots
```

### To run code formatter (prettier) run

```bash
npm pretty
```

### To run all linters use

This performs linting on:

* eslint (code-lint script)
* schema (schema-lint script)
* types (type-lint script)

```bash
npm lint
```

### To run only the typechecker use

```bash
npm type-lint
```

or incremental (in watch mode)

```bash
npm type-lint --watch
```