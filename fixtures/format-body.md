# CipherLink format fixture

Plain paragraph with **bold**, *italic*, ==highlighted==, and ~~struck~~ text.

## Lists and tasks

- Item one
- Item two
  - Nested item

1. Ordered one
2. Ordered two

- [ ] Open task
- [x] Completed task

> A block quote.

> [!note] Synthetic callout
> Callout content with `inline code`.

## Links

- [[Public target]]
- [[Public target#Heading|Heading alias]]
- [[Public target#^block-id]]
- [External link](https://example.com)
- ![[Synthetic image.png]]

## Table

| Column A | Column B |
| --- | ---: |
| Alpha | 1 |
| Beta | 2 |

## Code and math

```js
const synthetic = true;
```

Inline math $a^2 + b^2 = c^2$.

$$
E = mc^2
$$

Footnote reference[^fixture].

[^fixture]: Synthetic footnote content.

Private body tag: #private-fixture
