# CipherLink

CipherLink creates encrypted Markdown notes in Obsidian while keeping user-selected metadata and relationships visible to native search, tags, backlinks, and Graph view.

## How it works

Each secure note has two parts:

```text
Project note.md                         Public Markdown envelope
.cipherlink/objects/<id>.md.age        Encrypted Markdown body
```

The envelope contains only metadata the user explicitly chooses to expose, such as title, aliases, tags, status, and relationship links. Obsidian opens that envelope with its native Markdown view, while CipherLink replaces the encrypted-content callout with an in-memory secure editor. Decrypted text is never inserted into the outer Markdown document.

`Public relationships` / `公开关系` is an intentional section of the public envelope. The initial `No public relationships` entry means that no public links have been added yet; it is not encrypted-body content. Use **Edit public metadata** to publish only links that may remain visible while the note is locked.

## Modes

- **Standalone:** encrypted objects are stored inside the vault and can be synced like ordinary files.
- **Gateway:** the vault keeps the public envelope while a compatible gateway stores authoritative encrypted versions and provides conflict control and audit.

Gateway mode is optional. CipherLink does not require a server for normal use.

## First use

1. Open CipherLink settings to create an identity, or create the first encrypted document and set a password of at least 8 characters when prompted.
2. Use **Create encrypted document** from the command palette, ribbon, or a folder's context menu. CipherLink directly creates an untitled note in Obsidian's configured new-note location; rename it through the normal file explorer.
3. Add only aliases, tags, and relationships that may remain visible while locked by using **Edit public metadata** after creation.
4. Use **Lock session** when leaving Obsidian unattended.

Existing users can import a compatible protected age identity package and create a public envelope for a selected `.md.age` file without decrypting or rewriting that ciphertext.

## Current status

- Released version: `0.1.0`
- Development version: `v0.1.1-dev.3`
- Desktop acceptance: key standalone flows passed on Obsidian 1.10.6
- Status: Community submission is live, the `0.1.0` automated review is complete, and official directory inclusion is pending
- Mobile acceptance: explicitly deferred and not claimed as tested
- Gateway deployment acceptance: pending; standalone use does not require a gateway

Implemented scope and acceptance status are tracked in [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md).
The native envelope and embedded secure-body architecture is specified in [docs/NATIVE_INTEGRATION.md](docs/NATIVE_INTEGRATION.md).

## Security summary

- The unlock password is never saved.
- The user age identity is stored only in passphrase-protected form.
- The protected identity follows the vault's configured settings directory rather than assuming `.obsidian`.
- Encrypted note bodies are not written to ordinary Markdown files, temporary files, plugin data, or logs.
- Public envelope metadata is readable by Obsidian, sync software, other plugins, and local AI tools.
- CipherLink cannot isolate plaintext from a malicious plugin running in the same Obsidian process.
- Losing both the identity package and its password makes standalone notes unrecoverable; back up the protected identity separately.

See [docs/SECURITY.md](docs/SECURITY.md) before using real data.

## Privacy and network access

- CipherLink has no telemetry, advertising, account system, or payment feature.
- Standalone mode performs no network requests.
- Gateway mode contacts only the endpoint configured by the user. Non-loopback endpoints must use HTTPS; HTTP is permitted only for local development on loopback addresses.
- Gateway requests contain encrypted note objects, public envelope/configuration data, protocol challenges, and short-lived session tokens. Decrypted Markdown bodies and identity passwords are not sent to the gateway.
- Identity import reads only the vault-relative file explicitly selected by the user.

## Installation

Official Community directory availability is pending. For manual installation, download `main.js`, `manifest.json`, and `styles.css` from the [0.1.0 GitHub release](https://github.com/gooderno1/CipherLink/releases/tag/0.1.0) and place them in `<vault-config-dir>/plugins/cipher-link/`. Restart Obsidian, then enable CipherLink under Community plugins.

## Development

```bash
npm install
npm run verify
```

The repository uses only synthetic fixtures. Runtime identities, encrypted objects, and test vaults belong under `local_dev_work/` and are ignored by Git.
