# Deployment

## Development

`docker-compose.yml` starts PostgreSQL, Qdrant and the application. Database/vector ports are exposed for local administration only.

## Production topology

Recommended topology:

- reverse proxy / HTTPS
- one or more Next.js application replicas
- managed/private PostgreSQL
- private Qdrant
- internal or cloud OpenAI-compatible LLM and embedding endpoints
- durable shared file/object storage
- optional durable job queue/worker for imports, indexing, export and OpenWebUI sync

Do not expose PostgreSQL or Qdrant publicly.

## Required environment values

Set `DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `LLM_*`, `EMBEDDING_*`, `QDRANT_*` and `FILE_STORAGE_*`. OpenWebUI variables are optional and synchronization is disabled unless `OPENWEBUI_SYNC_ENABLED=true`.

## Database

Generate and deploy migrations before application rollout:

```bash
pnpm db:generate
pnpm db:deploy
```

Use `pnpm db:seed` only for development/test environments unless you have explicitly adapted the seed policy.

## Health

- `/api/health`: process health
- `/api/ready`: dependency readiness

Use readiness for load-balancer admission.

## Scaling notes

Move local file storage to object storage before running multiple replicas. Use a distributed rate limiter and durable queue when scaling horizontally. Qdrant collection dimensions must match `EMBEDDING_DIMENSIONS`; changing the embedding model/dimension requires controlled reindexing.
