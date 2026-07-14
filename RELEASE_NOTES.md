# Release notes

## 0.1.0 - 2026-07-15

- Add Chinese and English interfaces with automatic detection and Chinese fallback.
- Make setup user-initiated from settings or first document creation.
- Use an eight-character minimum while continuing to recommend stronger passwords for real data.
- Add settings, ribbon, command palette, and file-menu document creation entry points.
- Keep aliases, tags, and explicitly public relationships in a native Markdown envelope while storing the private body as an age-encrypted object.
- Embed the decrypted body in Obsidian's native Markdown page without inserting plaintext into the outer editor state.
- Support standalone storage, an optional versioned gateway provider, protected identity import, password changes, and legacy `.md.age` envelope migration.
- Bind embedded bodies to immutable envelope IDs so reused editor leaves cannot display a different document's decrypted body.
- Store the protected identity under the vault's configured settings directory and remove project-specific import defaults.
- Require HTTPS for non-loopback gateway endpoints and reject unsafe local object paths.

This public beta passed automated verification and the key standalone desktop flows on Obsidian 1.10.6. Mobile behavior and a real gateway deployment remain unverified and are not claimed as supported acceptance results for this release.
