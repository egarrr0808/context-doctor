# Contributing

Thanks for helping improve context-doctor.

## Run Locally

```bash
npm install
npm run build
node packages/cli/dist/index.js explain
```

## Tests

```bash
npm test
npm run typecheck
```

## Pull Requests

- Keep PRs focused.
- Tests must pass.
- Add a test for new features or behavior changes.
- Update docs when commands, output, or integrations change.

## Good First Issues

- Add support for Llama 3 tokenizer.
- Add `--output json` flag to compare command.
- Detect prompt injection patterns as a waste type.
