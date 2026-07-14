import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { encryptText } from "../src/crypto/crypto";

const vaultIndex = process.argv.indexOf("--vault");
if (vaultIndex < 0 || !process.argv[vaultIndex + 1]) {
  throw new Error("Usage: npm run fixture:gui -- --vault <vault-path>");
}

const vault = path.resolve(process.argv[vaultIndex + 1]);
const pluginDataPath = path.join(vault, ".obsidian", "plugins", "cipher-link", "data.json");
const settings = JSON.parse(await readFile(pluginDataPath, "utf8")) as {
  initialized?: boolean;
  userRecipient?: string;
};
if (!settings.initialized || !settings.userRecipient?.startsWith("age1")) {
  throw new Error("Initialize CipherLink in the test vault before creating the GUI fixture.");
}

const id = "cipherlink-gui-format-20260714-v2";
const notesFolder = path.join(vault, "CipherLink");
const objectsFolder = path.join(vault, ".cipherlink", "objects");
const envelopePath = path.join(notesFolder, "CipherLink 完整格式测试.md");
const objectPath = path.join(objectsFolder, `${id}.md.age`);
const targetPath = path.join(vault, "CipherLink 测试目标.md");
const fixture = await readFile(path.resolve("fixtures", "format-body.md"), "utf8");
const privateBody = `${fixture.trimEnd()}\n\nGUI 持久化检查标记：CIPHERLINK_GUI_PRIVATE_MARKER_20260714\n`;
const ciphertext = await encryptText(privateBody, [settings.userRecipient]);

await mkdir(notesFolder, { recursive: true });
await mkdir(objectsFolder, { recursive: true });
await writeFile(objectPath, ciphertext, { flag: "wx" });
await writeFile(
  targetPath,
  "# CipherLink 测试目标\n\n用于检查公开关系、反链和锁定状态下的可发现性。\n",
  { flag: "wx" },
);
await writeFile(
  envelopePath,
  `---
cipherlink: true
cipherlink_format: 1
cipherlink_id: "${id}"
cipherlink_provider: local
cipherlink_object: ".cipherlink/objects/${id}.md.age"
aliases:
  - CipherLink 格式检查
  - 加密文档测试
tags:
  - cipherlink-test
  - security-test
---
# CipherLink 完整格式测试

> [!locked] 加密内容
> 请使用 CipherLink 打开本文档，并解锁当前会话以查看或编辑私有正文。

## 公开关系
- [[CipherLink 测试目标]]
`,
  { flag: "wx" },
);

const persistedCiphertext = await readFile(objectPath);
if (persistedCiphertext.includes(Buffer.from("CIPHERLINK_GUI_PRIVATE_MARKER_20260714"))) {
  throw new Error("GUI fixture plaintext marker leaked into ciphertext.");
}

process.stdout.write(`Created encrypted GUI fixture: ${envelopePath}\n`);
