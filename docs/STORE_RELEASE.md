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
- [ ] Submit the repository through the account-authenticated Obsidian Community directory portal and record the review URL or status.
