# Security model

## Protected assets

- Encrypted Markdown body.
- User age private identity.
- Unlock password.
- Gateway session and service details.

## Intentionally public assets

- Ordinary Markdown envelope.
- Filename, title, aliases, tags, and public relationship links.
- Public age recipients.
- Opaque object IDs and provider type.

Public metadata may still reveal sensitive facts. CipherLink must label it as visible to the vault, sync providers, other plugins, and AI tools.

## Password and identity

- First use generates a user age identity.
- The identity is encrypted with the user password using the age passphrase format.
- The interface accepts passwords from eight characters; this is a product floor, not a strength recommendation. Real sensitive data should use a longer unique password.
- The password and decrypted identity remain in memory only for the current session.
- Changing the password re-protects the identity package; it does not re-encrypt every note.
- Standalone users who lose both the password and identity recovery material cannot recover their notes.

## Plaintext handling

- The ordinary `MarkdownView` may host the public envelope, but decrypted text must remain inside CipherLink's nested in-memory component and must never enter the outer editor state.
- Do not write plaintext bodies to files, plugin settings, logs, clipboard, browser storage, or MetadataCache.
- Clear active editor and render state on lock, unload, and restart.
- JavaScript garbage collection prevents a guarantee of physical memory zeroization.
- Treat public envelopes as untrusted input: local ciphertext references are restricted to vault-relative `.md.age` paths before any read or write.

## Process boundary

CipherLink cannot protect decrypted content from a malicious community plugin running in the same Obsidian process, a compromised operating system, screenshots, or deliberate user export.

## Gateway boundary

- Gateway mode requires an explicit compatible provider.
- Gateway connections require HTTPS. Plain HTTP is accepted only for loopback development addresses.
- A gateway may add versions, conflicts, audit, and controlled model operations.
- Gateway mode must not weaken standalone behavior or expose a universal decryption API.
