# Security

## Authorization

All mutations and knowledge operations require server-side authorization. Form discovery additionally honors `OPEN`, user, role, and department assignments. Knowledge access is resolved before structured queries or vector retrieval; inaccessible submissions must never be placed in model context.

## AI safety

LLM output is untrusted. Field keys and values are validated against the published schema. Narrative extraction requires evidence found in the originating user message after Unicode normalization. User-confirmed values cannot be silently overwritten. Hidden chain-of-thought is neither requested nor stored.

## Sensitive data

`isSensitive` and `isEmbeddable` are enforced by the knowledge representation layer. Sensitive fields are omitted from internal semantic indexing and OpenWebUI publication. Do not relax these filters at the prompt layer; policy enforcement belongs in application code.

## Authentication and secrets

- Better Auth manages browser sessions and credential hashes.
- External clients use `efk_app_*` Bearer secrets; store only the SHA-256 hash plus a lookup prefix.
- Never log Authorization headers, raw API secrets, database credentials, or OpenWebUI API keys.
- `.env.example` contains placeholders only. Use a secret manager in production.
- Use a dedicated least-privilege OpenWebUI service identity.

## External employee identity

The API client identity and the employee identity are separate. `X-Employee-No` is resolved to an existing active user. For production SSO, replace this resolver with validated corporate OIDC/JWT claims rather than trusting arbitrary user IDs.

## Deployment controls

Terminate TLS at a trusted reverse proxy, set secure cookie/origin settings, restrict PostgreSQL/Qdrant to private networks, add distributed rate limiting when multiple replicas are used, and run application/database accounts with least privilege.

## Audit

Security-meaningful form lifecycle, review, indexing/integration and knowledge-query actions are recorded in `AuditEvent`. User deactivation is soft so historical ownership/audit references remain intact.
