# Mobile acceptance

Use an isolated mobile vault with synthetic content only. Do not enable CipherLink in a production vault or import a real identity during this test.

## Package

Install these three production files under the mobile vault's configured plugin directory at `plugins/cipher-link/`:

- `main.js`
- `manifest.json`
- `styles.css`

Restart Obsidian after copying the files, enable community plugins, and enable CipherLink. The folder name must match the manifest ID `cipher-link`.

## Acceptance sequence

1. Start Obsidian with no CipherLink identity. Confirm startup does not force a password dialog and the Chinese or English interface follows the selected language.
2. Create the first encrypted document. Confirm setup accepts eight characters, rejects seven, and continues document creation after successful setup.
3. Create two encrypted documents in sequence. The second body must start empty; enter different synthetic text in each note and switch between them repeatedly.
4. Exercise headings, emphasis, lists, tasks, a callout, a table, code, tags, and WikiLinks. Confirm the touch keyboard and toolbar do not cover the active line or resize controls unexpectedly.
5. Switch between edit and reading modes. Follow a WikiLink, return through navigation history, and confirm the public envelope remains a native Markdown page.
6. Edit aliases, tags, and public relationships. Confirm `No public relationships` / `无公开关系` is only the initial public placeholder and that published links remain visible while locked.
7. Save, close, and reopen both notes. Confirm bodies remain isolated and the public `.md` envelopes contain no private synthetic marker.
8. Lock the session manually. Confirm all visible private bodies disappear and reopening a note requires the password.
9. Send Obsidian to the background, return, then terminate and restart the app. Confirm a terminated app starts locked and no decrypted body appears before unlock.
10. Rotate the device and repeat editing with the software keyboard open. Confirm toolbar buttons, password fields, notices, and the private body remain usable without overlap.

## Pass criteria

- No crash, blank secure-body widget, cross-document body display, or plaintext body in the public envelope.
- Identity setup, unlock, save, lock, restart, reading mode, and public metadata work on the tested mobile platform.
- Record the mobile OS, OS version, device class, Obsidian version, CipherLink commit, and whether the test used a custom vault configuration directory.

Gateway deployment is a separate acceptance activity. Mobile standalone acceptance does not require a gateway URL or real network credentials.
