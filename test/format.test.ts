import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse } from "yaml";

test("public envelope exposes only native metadata and explicit relationships", async () => {
  const content = await readFile("fixtures/envelope-example.md", "utf8");
  const frontmatterText = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  assert.ok(frontmatterText);
  const frontmatter = parse(frontmatterText) as Record<string, unknown>;
  assert.equal(frontmatter.cipherlink, true);
  assert.equal(frontmatter.cipherlink_format, 1);
  assert.equal(frontmatter.cipherlink_provider, "local");
  assert.deepEqual(frontmatter.tags, ["cipherlink-fixture"]);
  assert.match(content, /\[\[Public target\]\]/);
  assert.doesNotMatch(content, /private-fixture|Synthetic footnote content|const synthetic/);
});

test("synthetic body fixture covers the Markdown acceptance matrix", async () => {
  const body = await readFile("fixtures/format-body.md", "utf8");
  for (const pattern of [
    /^# /m,
    /\*\*bold\*\*/,
    /\*italic\*/,
    /==highlighted==/,
    /~~struck~~/,
    /- \[ \]/,
    /> \[!note\]/,
    /\[\[Public target#Heading\|Heading alias\]\]/,
    /^\| Column A \|/m,
    /```js/,
    /\$\$[\s\S]*E = mc\^2[\s\S]*\$\$/,
    /\[\^fixture\]/,
  ]) {
    assert.match(body, pattern);
  }
});
