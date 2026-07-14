# Native Obsidian integration

## Decision

CipherLink uses Obsidian's native Markdown view as the public envelope shell. The decrypted body is mounted inside that page as a nested in-memory component. It is never copied into the outer editor document.

## Data ownership

| Surface | Owner | Persistence |
| --- | --- | --- |
| Filename, properties, aliases, tags | Obsidian envelope | Public Markdown |
| Public relationships | Obsidian envelope | Public Markdown |
| CipherLink callout | Envelope format | Public Markdown |
| Private Markdown body | Secure body controller | Memory and age ciphertext only |
| Password and private identity | Secure session | Memory only after unlock |

## Editor integration

- `registerEditorExtension` detects `cipherlink: true` from the outer editor state.
- A StateField replaces the `[!cipherlink]` callout with a block widget.
- Widgets are keyed by immutable `cipherlink_id`; a preferred `TFile` is accepted only after its parsed envelope ID matches, which prevents stale-file reuse when Obsidian reuses a leaf.
- The widget owns a nested CodeMirror editor and encrypts changes through the selected provider.
- `registerMarkdownPostProcessor` replaces the rendered callout in Obsidian reading mode.
- New documents and migrated objects both open through `WorkspaceLeaf.openFile`; no custom workspace view or asynchronous redirect is used.

The legacy version-1 `[!locked] Encrypted content` and `[!locked] 加密内容` callouts are accepted. New envelopes use `[!cipherlink]`.

## Lifecycle

```text
mounted + locked -> unlock -> loading -> editing/reading
editing -> debounce -> encrypt -> provider save
editing/reading -> lock -> flush -> clear editor and plaintext -> locked
widget removal -> flush queued save -> unload controller
plugin unload -> destroy visible plaintext -> revoke gateway session -> clear identity
```

Gateway saves retain optimistic version ordering. A controller executes queued saves serially and reads the latest successful version when each queued save starts.

## Security invariants

- Private Markdown must not enter the outer Markdown editor state, envelope file, frontmatter, metadata cache, plugin settings, or logs.
- The public envelope remains readable by Obsidian, sync software, other plugins, and AI tools.
- Private links and tags do not become native backlinks or search results unless the user explicitly publishes them to the envelope.
- CipherLink does not claim isolation from another plugin in the same Obsidian process.
- No temporary plaintext file or unsupported virtual `TFile` is used.

## Acceptance

- Creation and reopening both retain workspace view type `markdown`.
- Live Preview and reading mode both show the embedded secure region.
- Existing version-1 envelopes open without rewriting their ciphertext.
- Lock, tab close, view change, restart, rename, move, and save failure preserve ciphertext and clear visible private state.
- Known private markers do not appear in persisted vault or plugin files.
- Disabling CipherLink leaves only the public envelope and its encrypted-content callout visible.
