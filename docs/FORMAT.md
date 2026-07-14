# Secure note format

## Public envelope

The user-facing note is an ordinary `.md` file so Obsidian can index its title, aliases, tags, and explicitly public relationships.

```markdown
---
cipherlink: true
cipherlink_id: 019f...
cipherlink_provider: local
cipherlink_object: .cipherlink/objects/019f....md.age
aliases:
  - Example alias
tags:
  - secure-note
---

> [!cipherlink] Encrypted content
> Open with CipherLink to unlock and edit the protected body.

## Public relationships

- [[Example project]]
```

The envelope is the source of truth for public metadata. Obsidian and other tools may read it without unlocking CipherLink.

CipherLink replaces the `cipherlink` callout with its in-memory secure body component in Obsidian Live Preview and reading mode. The decrypted body is never inserted into the outer Markdown editor state. Version-1 envelopes using the former `[!locked] Encrypted content` or `[!locked] 加密内容` callout remain compatible.

The relationship heading may be `Public relationships` or `公开关系`. Both are format-version-1 compatible and are parsed without changing existing documents.

## Encrypted object

- Stored as age-compatible binary ciphertext.
- Plaintext payload is UTF-8 Markdown.
- Standalone objects are stored under the configurable `.cipherlink/objects/` folder.
- Standalone object references must be vault-relative paths ending in `.md.age`; absolute paths and traversal segments are rejected before any read or write.
- Gateway objects are addressed by an opaque `cipherlink_ref`; the envelope contains no backend path.
- The decrypted body is the source of truth for private content and private relationships.

## Visibility rules

Public by explicit user choice:

- Envelope filename and title.
- Aliases, tags, status, dates, and other selected properties.
- Links written under `Public relationships`.
- Provider type and opaque object reference.

Encrypted by default:

- Body paragraphs and headings.
- Links and tags typed inside the encrypted editor.
- Attachments unless separately published.
- Extracted summaries, search index, and content previews.

CipherLink must never automatically copy private body tags or links into the public envelope. Publishing a private relationship requires an explicit user action.

## Provider fields

Standalone:

```yaml
cipherlink_provider: local
cipherlink_object: .cipherlink/objects/<id>.md.age
```

Gateway:

```yaml
cipherlink_provider: gateway
cipherlink_ref: CL-<opaque-id>
```

## Versioning

The format version is stored as `cipherlink_format: 1`. Readers must reject unsupported versions instead of guessing.
