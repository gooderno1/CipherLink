# Store release checklist

Reviewed against the official Obsidian submission and plugin-guideline documentation on 2026-07-15.

- [x] Repository is public at `gooderno1/CipherLink` and contains `README.md`, `LICENSE`, and `manifest.json` at root.
- [x] Manifest ID and name are currently unique in the Community directory; the ID contains no `obsidian`, and the manifest version uses `x.y.z`.
- [x] Description is 98 characters and ends with a period.
- [x] `minAppVersion` 1.10.6 matches the desktop version used for user GUI acceptance.
- [x] No Node or Electron API is present in the production bundle while `isDesktopOnly` is false.
- [x] Commands have no default hotkeys and IDs are not prefixed with the plugin ID.
- [x] UI uses sentence case, Obsidian components, theme variables, and no unsafe HTML insertion.
- [x] Runtime secure-body and gateway session resources are cleaned up on unload.
- [x] Production source contains no debug `console.log` calls.
- [x] Production dependency audit reports no vulnerabilities; declared licenses are MIT or BSD-3-Clause.
- [x] Public GitHub CI reproduces `npm ci` and `npm run verify` on Ubuntu with Node 22.
- [x] GitHub release tags `0.1.0` and `0.1.1` match their manifests; both published releases contain verified `main.js`, `manifest.json`, and `styles.css` assets. The `0.1.1` assets also have GitHub artifact attestations.
- [x] Automated format, migration, path-safety, encryption, and plaintext-persistence checks pass; key standalone desktop GUI flows passed on Obsidian 1.10.6.
- [ ] Execute the isolated-vault sequence in [`MOBILE_ACCEPTANCE.md`](MOBILE_ACCEPTANCE.md) on each claimed mobile platform. Mobile acceptance was explicitly deferred by the user on 2026-07-15, is not claimed as passed, and does not block this beta by that decision.
- [ ] Auto, Chinese, and English interfaces are checked across setup, settings, editor, and commands.
- [x] User explicitly approved publishing the release and proceeding toward Community directory submission on 2026-07-15.
- [x] Community submission is live; automated review for `0.1.0` at commit `4c4d17e` completed without failed checks.

## Automated review follow-up

- The initial incomplete review recommends GitHub artifact attestations, avoiding whole-vault enumeration, and avoiding browser storage.
- `v0.1.1-dev.1` adds attestations for future release assets, replaces the direct language-value browser-storage read with Obsidian's public `getLanguage()` API, and limits envelope resolution/migration checks to known or same-folder files.
- `v0.1.1-dev.2` addresses the completed review's remaining actionable source and CSS warnings: Node's built-in module list, popout-safe document ownership, guarded frontmatter, void event callbacks, control-character validation without control-character regexes, non-deprecated internal settings refresh, and CSS specificity without `!important`.
- The settings tab retains its imperative `display()` entry point because `minAppVersion` remains 1.10.6; declarative `getSettingDefinitions()` is available only from Obsidian 1.13.0 and would require a compatibility-floor change and new GUI acceptance.
- `v0.1.1-dev.3` fixes a clean-vault acceptance race: newly created envelopes now carry a one-use secure-focus request. The embedded component immediately moves focus off the public envelope while loading and gives the ready private editor the same captured focus intent.
- A second clean-vault persistence scan showed that focus handoff alone was not a sufficient boundary: input could still reach the public callout before the embedded editor was ready. `v0.1.1-dev.4` makes the outer editor read-only for CipherLink envelopes while leaving the nested private editor editable. Public metadata remains editable through CipherLink's explicit metadata action. The focus request now also blurs the outer editor immediately and focuses the safe container on the next animation frame.
- A third clean-vault scan showed that Obsidian's earlier default-precedence editable facet overrode dev.4's value. `v0.1.1-dev.5` registers the envelope read-only facet at CodeMirror's highest precedence and independently filters user-originated outer-document changes. External file synchronization and CipherLink's explicit metadata writes remain allowed.
- Dev.5 then exposed a build-level defect when the first envelope was opened: the production bundle contained a second CodeMirror/Lezer runtime instead of using Obsidian's instances. `v0.1.1-dev.6` externalizes the complete official Obsidian runtime module set and makes duplicate-runtime signatures fail the production security scan.
- Dev.6 passed developer-controlled runtime acceptance in an isolated Obsidian 1.10.6 desktop process: plugin cold load, setup, create/open, nested private editing, outer write rejection, metadata update, lock, full restart relock, unlock, cross-document isolation, ciphertext growth, and non-ciphertext plaintext scanning all passed.
- The user completed the separate fifth zero-state vault sequence. The post-test scan found three exact public envelopes and three matching age objects, including two objects with encrypted body growth; no plaintext body lines, orphan objects, temporary files, browser-storage fields, passwords, or private identities appeared outside protected ciphertext. This closes desktop patch acceptance for `0.1.1`.
