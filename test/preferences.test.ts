import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { detectLanguage, localizeError, resolveLanguage, translate } from "../src/i18n";
import { isPasswordLengthValid, MIN_PASSWORD_LENGTH } from "../src/security/password";

test("password setup accepts eight characters and rejects seven", () => {
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(isPasswordLengthValid("1234567"), false);
  assert.equal(isPasswordLengthValid("12345678"), true);
});

test("language detection supports Chinese, English, and Chinese fallback", () => {
  assert.equal(detectLanguage(["zh-CN", "en-US"]), "zh");
  assert.equal(detectLanguage(["en-US", "zh-CN"]), "en");
  assert.equal(detectLanguage(["fr-FR"]), "zh");
  assert.equal(resolveLanguage("auto", "en-US"), "en");
  assert.equal(resolveLanguage("auto", "zh-CN"), "zh");
  assert.equal(resolveLanguage("zh", "en-US"), "zh");
  assert.equal(translate("zh", "command.create"), "创建加密文档");
  assert.equal(translate("en", "command.create"), "Create encrypted document");
  assert.equal(translate("zh", "modal.passwordMin", { min: 8 }), "密码至少需要 8 位。");
});

test("Obsidian filesystem errors are localized", () => {
  const t = (key: Parameters<typeof translate>[1], variables?: Record<string, string | number>) =>
    translate("zh", key, variables);
  assert.equal(localizeError(new Error("Folder already exists."), t), "目标文件夹已存在，请重试。");
  assert.equal(localizeError(new Error("File already exists."), t), "目标文档已存在，请重试或重命名现有文档。");
});

test("plugin startup is passive and creation follows Obsidian's new-note location", async () => {
  const source = await readFile("src/main.ts", "utf8");
  assert.equal(source.includes("onLayoutReady"), false);
  assert.equal(source.includes("CreateNoteModal"), false);
  assert.equal(source.includes("SECURE_NOTE_VIEW"), false);
  assert.equal(source.includes("setViewState"), false);
  assert.match(source, /openSetup\(proceed\)/);
  assert.match(source, /getNewFileParent\(activePath\)/);
  assert.match(source, /title: this\.t\("document\.untitled"\)/);
  assert.match(source, /registerEditorExtension\(createSecureBodyEditorExtension\(this\)\)/);
  assert.match(source, /registerMarkdownPostProcessor\(createSecureBodyPostProcessor\(this\)/);
  assert.match(source, /openFile\(file, \{ active: true \}\)/);
});

test("identity storage follows the configured vault directory without private defaults", async () => {
  const main = await readFile("src/main.ts", "utf8");
  const types = await readFile("src/types.ts", "utf8");
  const modals = await readFile("src/ui/modals.ts", "utf8");
  assert.match(main, /this\.app\.vault\.configDir/);
  assert.match(main, /plugins\/\$\{this\.manifest\.id\}\/identity\.age\.json/);
  assert.equal(main.includes("settings.identityPackagePath"), false);
  assert.equal(types.includes(".obsidian/plugins"), false);
  assert.equal(modals.includes("memoloom-secure/user.identity"), false);
  assert.match(modals, /private path = "";/);
});

test("standalone ciphertext access does not depend on Obsidian indexing unknown extensions", async () => {
  const provider = await readFile("src/providers/local-provider.ts", "utf8");
  const envelope = await readFile("src/envelope/envelope.ts", "utf8");
  assert.match(provider, /vault\.adapter\.readBinary\(objectPath\)/);
  assert.match(provider, /vault\.adapter\.writeBinary\(objectPath/);
  assert.equal(provider.includes("getAbstractFileByPath(objectPath)"), false);
  assert.match(envelope, /parseFrontmatter\(content\)/);
});

test("new documents start like native Obsidian notes and Live Preview hides inactive heading markup", async () => {
  const main = await readFile("src/main.ts", "utf8");
  const body = await readFile("src/editor/secure-body.ts", "utf8");
  const livePreview = await readFile("src/editor/live-preview.ts", "utf8");
  assert.match(main, /const initialBody = "";/);
  assert.match(body, /EditorSelection\.cursor\(this\.privateBody\.length\)/);
  assert.match(livePreview, /to: offset \+ heading\[0\]\.length/);
});

test("native integration embeds ciphertext editing without placing plaintext in the outer editor", async () => {
  const integration = await readFile("src/editor/native-integration.ts", "utf8");
  const body = await readFile("src/editor/secure-body.ts", "utf8");
  const envelope = await readFile("src/envelope/envelope.ts", "utf8");
  assert.match(integration, /editorInfoField/);
  assert.match(integration, /Decoration\.replace/);
  assert.match(integration, /createSecureBodyPostProcessor/);
  assert.match(integration, /other\.envelopeId === this\.envelopeId/);
  assert.match(body, /host\.saveBody\(envelope, body, this\.version\)/);
  assert.match(body, /host\.resolveEnvelope\(this\.expectedId, this\.preferredFile\)/);
  assert.match(body, /if \(this\.shouldFocus\(\)\) this\.editor\.focus\(\)/);
  assert.equal(body.includes("vault.modify"), false);
  assert.match(envelope, /> \[!cipherlink\]/);
});
