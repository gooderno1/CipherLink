# Optional gateway provider

CipherLink uses a provider interface. Standalone storage is the default; gateway storage is optional.

Production gateway URLs use HTTPS. CipherLink accepts plain HTTP only for localhost, `127.0.0.1`, and `::1` development endpoints.

## Required operations

```text
getPublicConfig()
createDocument(envelope, ciphertext)
openDocument(ref)
saveDocument(ref, baseVersion, primaryEpoch, ciphertext)
revokeSession()
```

## Protocol version 1 HTTP mapping

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/config/public` | Read protocol version, gateway recipient, and primary epoch |
| POST | `/api/v1/session/challenge` | Receive an age-encrypted one-time challenge |
| POST | `/api/v1/session/unlock` | Redeem the decrypted challenge for an in-memory token |
| DELETE | `/api/v1/session` | Revoke the current human session |
| POST | `/api/v1/objects` | Create a gateway-backed encrypted object |
| POST | `/api/v1/refs/{ref}/open` | Read ciphertext and its version token |
| PATCH | `/api/v1/objects/{id}` | Save with base version and primary epoch |

The public configuration endpoint may expose an age recipient because it is an encryption public key. It must not expose a user recipient, object list, storage path, ciphertext, plaintext, or credential.

## Human session

The compatible gateway encrypts a one-time challenge to the configured user recipient. CipherLink decrypts it with the active user identity and receives an in-memory session token. Network identity alone must not grant access to complete ciphertext objects.

## Envelope mapping

Gateway-backed notes store only:

```yaml
cipherlink_provider: gateway
cipherlink_ref: CL-<opaque-id>
```

The envelope never stores a gateway database path, private identity, session token, or plaintext body.

## Compatibility

Provider protocol version starts at `1`. CipherLink must reject incompatible gateways with a clear error and preserve the local envelope unchanged.
