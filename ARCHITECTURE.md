# Architecture

## Domain boundary

The platform is centered on generic forms, not a knowledge-capture session. A logical `FormDefinition` has versioned schemas. A `FormSubmission` always points to the exact `FormVersion` used, and dynamic values are stored as `FormFieldValue` records rather than database columns per template field.

## Application layers

- `src/app`: Next.js pages and thin request handlers.
- `src/modules/forms`: form definitions, versions, assignments and publishing.
- `src/modules/submissions`: lifecycle, dynamic values and concurrency.
- `src/modules/agents`: schema-aware form filling with LangGraph.
- `src/modules/imports`: DOCX/XLSX normalization and schema proposal.
- `src/modules/reviews`: review/approval workflow.
- `src/modules/knowledge`: deterministic knowledge representation, Qdrant indexing, safe analytics tools, query routing, grounded synthesis.
- `src/modules/api-clients`: external API authentication and employee resolution.
- `src/modules/auth`: Better Auth, RBAC and form-specific authorization.
- `src/lib/*`: provider adapters for database, LLM, vector store, storage, OpenWebUI, validation and HTTP errors.

## Form filling safety boundary

1. Persist the user message.
2. Supply only the active form schema and current values to the LLM.
3. Ask for a structured proposal.
4. Verify field keys, types, select options, evidence text and confirmation state in application code.
5. Reject unsupported evidence and changes to confirmed values.
6. Persist only validated changes in a transaction.

The LLM never receives SQL write access.

## Knowledge layer

Approved submissions are rendered deterministically from only `isEmbeddable && !isSensitive` fields. The document is hashed and chunked by semantic headings. Qdrant payload metadata carries submission/form/department/project identifiers used for filtering and source hydration.

The knowledge planner chooses one of:

- structured: controlled Prisma count/list/group services;
- semantic: embedding + Qdrant retrieval;
- hybrid: structured/authorization filters + vector retrieval.

Arbitrary LLM-generated SQL is not executed.

## OpenWebUI publisher

OpenWebUI is an optional second publication target. The internal platform remains independently usable. A synchronization record stores provider, target, external file ID, content hash, status and failure information. Identical hashes avoid duplicate publication; changed content can replace stale copies. Provider failure does not roll back an approved platform submission.

## Background work

The initial implementation keeps indexing and external publication behind dedicated service boundaries. For high-volume production deployments, invoke `indexSubmission`/OpenWebUI synchronization from a durable queue worker instead of extending HTTP route handlers. This can be introduced without changing submission or publisher contracts.
