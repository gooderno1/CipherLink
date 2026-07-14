import assert from "node:assert/strict";
import test from "node:test";
import { parse } from "yaml";
import {
  decodeGatewayPayload,
  encodeGatewayPayload,
} from "../src/providers/gateway-payload";

test("gateway control frontmatter is hidden from the editable Markdown body", () => {
  const id = "synthetic-object-id";
  const body = "# User body\n\nEditable content with [[Private link]].\n";
  const payload = encodeGatewayPayload(id, body);
  const frontmatter = payload.match(/^---\n([\s\S]*?)\n---/)?.[1];
  assert.ok(frontmatter);
  assert.equal((parse(frontmatter) as Record<string, unknown>).object_id, id);
  assert.equal(decodeGatewayPayload(id, payload), body);
  assert.throws(() => decodeGatewayPayload("different-id", payload));
});
