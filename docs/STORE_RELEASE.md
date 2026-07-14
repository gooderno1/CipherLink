# Store release checklist

Reviewed against the official Obsidian submission and plugin-guideline documentation on 2026-07-15.

- [ ] Repository is public and contains `README.md`, `LICENSE`, and `manifest.json` at root.
- [x] Manifest ID and name are currently unique in the Community directory; the ID contains no `obsidian`, and the manifest version uses `x.y.z`.
- [x] Description is 98 characters and ends with a period.
- [ ] `minAppVersion` 1.8.7 exposes the required APIs; runtime acceptance on that exact oldest version is still pending.
- [x] No Node or Electron API is present in the production bundle while `isDesktopOnly` is false.
- [x] Commands have no default hotkeys and IDs are not prefixed with the plugin ID.
- [x] UI uses sentence case, Obsidian components, theme variables, and no unsafe HTML insertion.
- [x] Runtime secure-body and gateway session resources are cleaned up on unload.
- [x] Production source contains no debug `console.log` calls.
- [x] Production dependency audit reports no vulnerabilities; declared licenses are MIT or BSD-3-Clause.
- [ ] GitHub release tag matches `manifest.json` and includes `main.js`, `manifest.json`, and `styles.css`.
- [ ] Synthetic GUI, mobile/desktop, upgrade, migration, and plaintext persistence checks pass.
- [ ] Auto, Chinese, and English interfaces are checked across setup, settings, editor, and commands.
- [ ] User explicitly approves publishing the release and submitting it to the Community directory.
