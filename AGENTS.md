# CipherLink collaboration rules

## Project scope

CipherLink is a general-purpose Obsidian community plugin for encrypted Markdown notes. It supports standalone vault storage and an optional controlled gateway provider. It must not contain assumptions, paths, names, or defaults tied to a specific private vault.

## Required boundaries

- Public source contains code, documentation, synthetic fixtures, and configuration examples only.
- Never commit passwords, private identities, tokens, private gateway URLs, encrypted user objects, runtime databases, or recovery sets.
- Plaintext note bodies exist only in the active plugin session. Do not write them to temporary files, plugin data, logs, browser storage, or Obsidian MetadataCache.
- The ordinary Markdown envelope is intentionally public to the vault. UI must clearly distinguish public metadata from encrypted content.
- Do not automatically publish tags or links extracted from encrypted content.
- Gateway support is optional. Standalone mode must remain fully usable without a server.

## Engineering workflow

1. Read `README.md`, `docs/FORMAT.md`, `docs/SECURITY.md`, and `DEVELOPMENT_LOG.md` before changing behavior.
2. Use Obsidian public APIs and documented CodeMirror 6 extension points. Avoid internal APIs unless the compatibility risk is documented and tested.
3. Use `FileManager.processFrontMatter`, `Vault.process`, and normalized paths for ordinary Markdown envelopes.
4. Every behavior change requires focused tests and an update to `DEVELOPMENT_LOG.md`.
5. Run `npm run verify` and `git diff --check` before committing.
6. Development commits use `vX.Y.Z-dev.N type(scope): description`. Store releases use plain `x.y.z` tags matching `manifest.json`.

## Store readiness

- Keep `README.md`, `LICENSE`, `manifest.json`, and release assets at repository root.
- UI text uses sentence case and no debug logging is enabled by default.
- The manifest ID must remain unique and must not contain `obsidian`.
- Do not create a public release until the synthetic format suite, GUI tests, mobile/desktop checks, and plaintext persistence checks pass.
