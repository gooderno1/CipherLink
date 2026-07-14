# Development plan

## Objective

Deliver a store-ready general Obsidian plugin that keeps selected metadata visible while encrypting note bodies, supports standalone and optional gateway storage, and offers a secure Live Preview editor.

## Stages

| Stage | Scope | Acceptance |
| --- | --- | --- |
| C0 | Public repository, format, security, store files | No private assumptions or runtime assets |
| C1 | First-run setup, password-protected identity, session lock | New user can configure without CLI |
| C2 | Public envelope and standalone provider | Native tags/backlinks work; body remains ciphertext |
| C3 | Secure Live Preview | Common Markdown edits without raw-text-only experience |
| C4 | Gateway provider and migration | Optional gateway use without breaking standalone mode |
| C5 | Compatibility and persistence acceptance | Desktop/mobile build, format fixture, no plaintext persistence |
| C6 | Public beta and Community directory submission | Release assets and review requirements pass |

## Current iteration

This iteration implements C0-C5 with synthetic data. The key desktop GUI flows passed user acceptance on 2026-07-15. The public repository and verified `0.1.0` GitHub release are available; C6 is awaiting Community directory submission and review.

Automated acceptance for C0-C5 passed on 2026-07-14. Desktop GUI acceptance covers the standalone synthetic-data workflow; mobile behavior and real gateway deployment are not implied by that result.

On 2026-07-15, the user explicitly deferred mobile acceptance and approved continuing with the `0.1.0` public beta. Mobile remains an open, unverified acceptance item rather than a passed result or a claim of compatibility.

`v0.1.0-dev.3` aligns creation with native Obsidian behavior: creation directly places an untitled encrypted document in the current new-note location, folder creation is idempotent, system errors are localized, and the optional gateway description identifies MemoLoomSecure as a compatible gateway example. A separate uninitialized vault is used for first-use GUI acceptance.

`v0.1.0-dev.4` fixes first-open failures found during that acceptance. Standalone `.md.age` objects are read and written through the vault adapter instead of Obsidian's indexed file list, so users do not need to enable unknown file extensions. Envelope loading also parses public frontmatter directly when the metadata cache has not caught up with a newly created note.

`v0.1.0-dev.5` restores the expected native editing presentation for newly created notes. A note body now starts empty instead of duplicating the filename as a Markdown heading, the editor opens at the end of existing content, and inactive heading markers are hidden by Live Preview while remaining editable on the active line.

`v0.1.0-dev.6` replaces the separate full-page secure view with a secure body component embedded in Obsidian's native Markdown view. Creation and reopening now use the same native `openFile` path; editor extensions replace the public CipherLink callout in source/Live Preview, and a Markdown post processor handles reading mode. Existing version-1 `[!locked]` envelopes remain readable while new envelopes use `[!cipherlink]`.

`v0.1.0-dev.7` fixes a native-leaf reuse race found during GUI acceptance. Embedded widgets are keyed and resolved by immutable `cipherlink_id` instead of trusting the timing of `editorInfoField.file`, preventing a newly created envelope from displaying the previous document's decrypted body. The active secure editor also takes focus after mounting so typing does not fall through to the public envelope.

The 2026-07-15 desktop regression passed. The apparent default text was the intentional public-relationship placeholder in the Markdown envelope, not a copied secure body or stale template content.

`v0.1.0-dev.8` hardens the public-release boundary: identity storage follows `Vault.configDir`, identity import has no private-project default, local object references reject absolute/traversing/non-`.md.age` paths, and non-loopback gateways require HTTPS. CI, release notes, and private vulnerability reporting are prepared for the public repository.

`0.1.0` promotes that reviewed build to the initial public beta without changing runtime behavior. Release metadata adds explicit privacy, network, desktop acceptance, and deferred-mobile disclosures.

## Required format coverage

- Headings, emphasis, highlight, strikeout, lists, tasks, quotes, callouts.
- Tables, fenced code, inline code, math, footnotes, external links.
- WikiLinks, aliases, headings, blocks, embeds, public backlinks.
- Local and gateway envelopes.
- Lock, restart, password failure, password change, and migration.

## Non-goals for the first store candidate

- Hiding public envelope metadata.
- Automatic publication of private links or tags.
- Strong isolation from other Obsidian plugins.
- Collaborative multi-user editing.
- Transparent encryption of arbitrary existing folders.
