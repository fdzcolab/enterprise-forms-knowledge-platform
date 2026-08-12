# Enterprise Forms & Knowledge Platform

Production-oriented greenfield implementation of an AI-powered enterprise forms platform. It converts managed form templates into structured submissions that can be completed traditionally or through a schema-aware conversational agent, reviewed, indexed in Qdrant, queried through a permission-aware knowledge agent, and optionally synchronized to an OpenWebUI Knowledge Base.

## Core capabilities

- Dynamic `FormDefinition` / immutable published `FormVersion` / `FormFieldDefinition` model
- DOCX and form-like XLSX import with AI-assisted schema proposal and mandatory admin review
- Traditional and conversational form filling against the same schema
- Exact evidence grounding and protection of user-confirmed fields
- Submission lifecycle, reviewer approval/rejection, audit history, optimistic concurrency
- PostgreSQL structured analytics + Qdrant semantic retrieval + hybrid query routing
- Retrieval authorization before SQL/vector source hydration
- Versioned `/api/v1` Bearer API for Windows and other enterprise clients
- Better Auth user sessions and policy-driven roles/permissions
- Optional, failure-isolated OpenWebUI Knowledge Base synchronization
- Persian/RTL-first interface while keeping domain/data model language-neutral
- OpenAPI JSON at `/api/openapi.json` and human-readable `/api/docs`

## Development start

```bash
cp .env.example .env
# Replace AUTH_SECRET and seed passwords before use.
docker compose up -d postgres qdrant
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3100`.

## Validation

```bash
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Important configuration

All model/provider endpoints are configurable through environment variables. The app expects OpenAI-compatible chat and embedding endpoints, making it suitable for cloud APIs, internal routers, or local vLLM deployments.

OpenWebUI synchronization is disabled by default. When enabled, only approved, embeddable, non-sensitive fields are rendered into deterministic Markdown. The internal PostgreSQL/Qdrant knowledge layer remains the system of record.

See [ARCHITECTURE.md](ARCHITECTURE.md), [SECURITY.md](SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [MIGRATION.md](MIGRATION.md).
