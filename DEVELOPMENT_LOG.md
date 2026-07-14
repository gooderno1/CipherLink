# Development log

## [2026-07-15] v0.1.1-dev.4 fix(security): make public envelopes read-only

- Trigger: The user completed the dev.3 second clean-vault sequence, but the required scan found typed content inside one public CipherLink callout while all three ciphertext objects remained the empty-body size. Dev.3 acceptance therefore failed.
- Cause: A focus request is an interaction hint, not a persistence boundary. Obsidian can focus its outer editor after the widget's mount microtask or accept input before the nested editor is ready.
- Implementation: Mark the outer CodeMirror editor non-editable whenever its current document is a CipherLink envelope. The nested private CodeMirror remains editable, and public metadata continues through the explicit metadata action. For creation ergonomics, immediately blur the outer editor and focus the safe container on the owning window's next animation frame before the private editor takes over.
- Acceptance boundary: Preserve both failed clean vaults. Test dev.4 in a third zero-state vault and require ciphertext growth, an unchanged public envelope, restart locking, and a clean persistence scan before preparing `0.1.1`.

## [2026-07-15] v0.1.1-dev.3 fix(security): prevent new-note focus fallthrough

- Trigger: The user completed the dev.2 clean-vault GUI sequence, but the required post-test persistence scan found one private test line in a new note's public Markdown envelope while its ciphertext object remained the empty-body size. The GUI result is therefore not accepted as passed.
- Cause: The secure editor decided whether to focus only after asynchronous envelope/decryption loading. During the mount interval, keyboard input could remain in Obsidian's outer Markdown editor and persist after the public relationship section.
- Implementation: Register a one-use focus request before opening a newly created or migrated envelope. The matching widget consumes it, moves focus to its non-editable secure container as soon as the DOM mounts, and passes the captured intent to the private editor when loading completes. Failed opens discard unconsumed requests.
- Acceptance boundary: Preserve the failed vault as evidence. Run dev.3 in a second zero-state vault and require both full Obsidian restart locking and a clean public-envelope persistence scan before preparing `0.1.1`.

## [2026-07-15] v0.1.1-dev.2 fix(review): address completed lint findings

- Trigger: The `0.1.0` Community automated review completed with no failed checks but reported source and CSS warnings in addition to the recommendations already handled by dev.1.
- Implementation: Replace `builtin-modules` with `node:module`; create editor DOM through the owning document; guard untyped frontmatter; remove unnecessary assertions and Promise-returning event callbacks; validate control characters without a control-character regex; refresh the imperative settings renderer directly; remove CSS `!important` through selector specificity.
- Compatibility decision: Keep the imperative `display()` entry point and Obsidian 1.10.6 minimum. The recommended declarative `getSettingDefinitions()` API starts at Obsidian 1.13.0, so adopting it requires a deliberate minimum-version change and fresh GUI acceptance.
- Directory status: Automated review is complete, but `cipher-link` is not yet present in the official `obsidianmd/obsidian-releases` directory. Do not describe the plugin as installable from Obsidian yet.

## [2026-07-15] v0.1.1-dev.1 fix(review): narrow vault access and add release provenance

- Trigger: The live Community directory entry began automated review for `0.1.0`. Its incomplete results recommended GitHub release-asset attestations and flagged whole-vault enumeration plus browser storage use.
- Assessment: The browser-storage match only read Obsidian's language preference and persisted nothing. Whole-vault fallback resolution did read Markdown files broadly, while migration duplicate detection enumerated all Markdown metadata.
- Implementation: Use Obsidian's public `getLanguage()` API; resolve envelopes only from the in-memory mapping, provided file, or active file; limit migration duplicate checks to Markdown siblings of the explicitly selected ciphertext. Add `actions/attest@v4` for future release assets.
- Release boundary: Keep the currently reviewed `0.1.0` tag and assets unchanged until the automated review reaches a final result. This work is a candidate for a later patch release.

## [2026-07-15] 0.1.0 release: prepare initial public beta

- Decision: The user explicitly deferred mobile testing and approved continuing with the public release and Community directory process. Mobile remains unverified and is not recorded as passed.
- Scope: Promote the reviewed `v0.1.0-dev.8` runtime to `0.1.0`; align package and release metadata; add explicit privacy, network, desktop acceptance, and mobile-status disclosures.
- Runtime behavior: Unchanged from `v0.1.0-dev.8`.
- Release gate: The complete local and GitHub verification suites passed. Tag `0.1.0` points to `4c4d17e`; the release workflow generated a draft and all downloaded asset hashes matched the local verified build before publication.
- Publication: `https://github.com/gooderno1/CipherLink/releases/tag/0.1.0` is public. SHA-256 values are `E82E9B6437469E304401226D718A2F3E420C4C99297F9A48286E76EE236F3822` for `main.js`, `A7ADC1141000EFD4A556AB299E26F34754C9A4B4C811074B024516446799B149` for `manifest.json`, and `2186CC8F956E332B4C781B58C8906E40616AEAB799502F7988B609AD43FB35E3` for `styles.css`.
- Remaining: Submit through the account-authenticated Obsidian Community directory portal and track review; mobile and real gateway deployment acceptance remain open.

## [2026-07-15] v0.1.0-dev.8 fix(security): harden public release boundaries

- Reason: Public-release review found that identity storage hardcoded `.obsidian` and the import modal prefilled a MemoLoomSecure-specific path. Both conflict with custom configuration directories and the standalone product boundary.
- Implementation: Derive the protected CipherLink identity path from `Vault.configDir` and the plugin manifest ID; discard the obsolete persisted path override; make identity import request an explicit vault-relative path without a private-project default. Reject absolute, traversing, or non-`.md.age` ciphertext references and require HTTPS for non-loopback gateways.
- Verification: Strict type checking, 17 automated tests, the production build, source/bundle security scan, dependency audit, license inventory, release-workflow parsing, and installed-bundle hash comparison pass.
- Publication: Publish only the reviewed snapshot to `gooderno1/CipherLink`; retain the earlier local development history on an unpushed archive branch. Public CI and private vulnerability reporting are enabled, but no release or tag exists.
- Remaining at that checkpoint: Mobile acceptance had not been completed. It was later explicitly deferred by the user for the initial public beta; the manifest minimum remains the user-accepted desktop version, Obsidian 1.10.6.

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
