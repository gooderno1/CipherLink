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
- [x] GitHub release tag `0.1.0` matches `manifest.json`; the published release contains verified `main.js`, `manifest.json`, and `styles.css` assets.
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
- The current `0.1.0` release remains unchanged while the `0.1.1` patch candidate completes acceptance.
