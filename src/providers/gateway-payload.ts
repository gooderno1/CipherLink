export function encodeGatewayPayload(id: string, body: string): string {
  return `---\nobject_id: ${JSON.stringify(id)}\ncipherlink_payload: 1\n---\n${body}`;
}

export function decodeGatewayPayload(id: string, payload: string): string {
  const match = payload.match(
    /^---\r?\nobject_id:\s*"([^"]+)"\r?\ncipherlink_payload:\s*1\r?\n---\r?\n/,
  );
  if (!match || match[1] !== id) {
    throw new Error("Gateway ciphertext has an invalid CipherLink control header.");
  }
  return payload.slice(match[0].length);
}
