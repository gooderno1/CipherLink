# Development log

## [2026-07-15] v0.1.0-dev.8 fix(security): harden public release boundaries

- Reason: Public-release review found that identity storage hardcoded `.obsidian` and the import modal prefilled a MemoLoomSecure-specific path. Both conflict with custom configuration directories and the standalone product boundary.
- Implementation: Derive the protected CipherLink identity path from `Vault.configDir` and the plugin manifest ID; discard the obsolete persisted path override; make identity import request an explicit vault-relative path without a private-project default. Reject absolute, traversing, or non-`.md.age` ciphertext references and require HTTPS for non-loopback gateways.
- Verification: Strict type checking, 17 automated tests, the production build, source/bundle security scan, dependency audit, license inventory, release-workflow parsing, and installed-bundle hash comparison pass.
- Publication: Publish only the reviewed snapshot to `gooderno1/CipherLink`; retain the earlier local development history on an unpushed archive branch. Public CI and private vulnerability reporting are enabled, but no release or tag exists.
- Remaining: Complete mobile acceptance before publishing `0.1.0` or submitting to the Community directory. The manifest minimum is the user-accepted desktop version, Obsidian 1.10.6.

## [2026-07-14] v0.1.0-dev.2 feat(ui): make setup optional and add Chinese localization

- Reason: User testing found the 12-character minimum too restrictive, startup setup modal too forceful, English-only settings unsuitable, and the create-document entry insufficiently visible.
- Implementation: Lower the product minimum to eight characters; remove startup setup; expose setup and identity import in settings; continue first-document creation after setup; add auto-detected Chinese/English UI with Chinese fallback and manual switching; expose document creation in settings, ribbon, command palette, and file menu.
- Test artifact: Generate `CipherLink/CipherLink 完整格式测试.md` in the ignored GUI vault by encrypting the complete Markdown fixture to a test-vault public recipient. No password or private identity was read.
- Verification: Nine automated tests, strict type checking, production build, security scan, installed-bundle hash comparison, and GUI-vault plaintext marker scan pass.
- Remaining: User checks the localized UI and decrypts the prepared fixture in Obsidian. Gateway GUI conflict handling and mobile behavior remain later acceptance items.

## [2026-07-14] v0.1.0-dev.1 feat: establish the general-purpose CipherLink plugin

- Reason: Separate the encrypted-note user experience from a private gateway project and support both standalone and gateway-backed use.
- Implementation: Define the public envelope format, provider contract, onboarding, secure Live Preview, synthetic format suite, and store-ready repository structure.
- Result: C0-C5 local beta candidate complete. Standalone storage, optional MemoLoomSecure gateway protocol version 1, identity import/password change, public metadata, secure editing, and legacy `.md.age` envelope migration are implemented.
- Verification: `npm run verify` passes strict type checking, six automated tests, production build, and security scan. Tests cover wrong passwords and identities, protected identity persistence, ciphertext plaintext-marker absence, public envelope fields, the Markdown format fixture, and hidden gateway control frontmatter.
- GUI attempt: A concurrent isolated Obsidian instance was unavailable because of desktop single-instance behavior. The running instance was not interrupted; GUI acceptance remained explicit.
- Remaining: Validate first-run setup, common and complex Markdown rendering, native tags/backlinks, lock/restart, gateway conflict behavior, desktop/mobile compatibility, and a second plaintext persistence scan before public release or Community directory submission.
