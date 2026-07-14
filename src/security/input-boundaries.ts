export function requireVaultRelativePath(value: string, label: string): string {
  const candidate = value.trim().replace(/\\/g, "/");
  if (
    !candidate ||
    candidate.startsWith("/") ||
    /^[a-z]:/i.test(candidate) ||
    /^[a-z][a-z0-9+.-]*:\/\//i.test(candidate) ||
    Array.from(candidate).some((character) => character.charCodeAt(0) <= 0x1f)
  ) {
    throw new Error(`${label} must be a vault-relative path.`);
  }
  const segments = candidate.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error(`${label} must not contain empty, current, or parent path segments.`);
  }
  return candidate;
}

export function requireAgeObjectPath(value: string): string {
  const candidate = requireVaultRelativePath(value, "Ciphertext object path");
  if (!candidate.toLowerCase().endsWith(".md.age")) {
    throw new Error("Ciphertext object path must end with .md.age.");
  }
  return candidate;
}

export function requireGatewayBaseUrl(value: string): string {
  const candidate = value.trim().replace(/\/+$/, "");
  if (!candidate) throw new Error("Gateway URL is not configured.");
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("Gateway URL is invalid.");
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Gateway URL must not contain credentials, a query, or a fragment.");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && loopback)) {
    throw new Error("Gateway URL must use HTTPS; HTTP is allowed only for loopback development.");
  }
  return candidate;
}
