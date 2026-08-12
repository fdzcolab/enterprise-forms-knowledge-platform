export const openapi = {
  openapi: "3.1.0",
  info: {
    title: "Enterprise Forms & Knowledge Platform API",
    version: "1.0.0",
    description: "Versioned JSON API for internal applications. API clients authenticate with Bearer tokens and identify the actual employee with X-Employee-No.",
  },
  servers: [{ url: "/", description: "Current deployment" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "efk_app_<secret>" } },
    parameters: {
      EmployeeNo: { name: "X-Employee-No", in: "header", required: true, schema: { type: "string" }, description: "Corporate employee number resolved to an active platform user." },
    },
    schemas: {
      ApiError: { type: "object", properties: { error: { type: "object", required: ["code", "message"], properties: { code: { type: "string" }, message: { type: "string" }, details: {} } } } },
      FieldUpdate: { type: "object", required: ["value"], properties: { fieldId: { type: "string" }, fieldKey: { type: "string" }, value: {}, confirmedByUser: { type: "boolean", default: true } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/api/v1/forms": { get: { summary: "List forms available to the employee", parameters: [{ $ref: "#/components/parameters/EmployeeNo" }], responses: { "200": { description: "Available published forms" }, "401": { description: "Invalid API client" }, "403": { description: "Insufficient scope" } } } },
    "/api/v1/forms/{formId}": { get: { summary: "Get a published form schema", parameters: [{ name: "formId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], responses: { "200": { description: "Form and dynamic fields" }, "404": { description: "Form not found" } } } },
    "/api/v1/submissions": { post: { summary: "Create a submission", parameters: [{ $ref: "#/components/parameters/EmployeeNo" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["formId"], properties: { formId: { type: "string" }, context: { type: "object", additionalProperties: true } } } } } }, responses: { "201": { description: "Submission created" }, "403": { description: "Form not assigned/allowed" } } } },
    "/api/v1/submissions/{submissionId}": { get: { summary: "Get a submission", parameters: [{ name: "submissionId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], responses: { "200": { description: "Submission" } } } },
    "/api/v1/submissions/{submissionId}/messages": {
      get: { summary: "List conversation messages", parameters: [{ name: "submissionId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], responses: { "200": { description: "Messages" } } },
      post: { summary: "Send a conversational form-filling message", description: "clientMessageId is required for idempotency. Repeating the same value does not duplicate the exchange.", parameters: [{ name: "submissionId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["clientMessageId", "content"], properties: { clientMessageId: { type: "string" }, content: { type: "string" } } } } } }, responses: { "200": { description: "Agent response and field changes" }, "503": { description: "Agent unavailable; user message remains persisted" } } },
    },
    "/api/v1/submissions/{submissionId}/fields": { patch: { summary: "Update structured fields", description: "Uses optimistic concurrency. Pass the latest submission revision.", parameters: [{ name: "submissionId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["revision", "updates"], properties: { revision: { type: "integer" }, updates: { type: "array", items: { $ref: "#/components/schemas/FieldUpdate" } } } } } } }, responses: { "200": { description: "Updated submission revision" }, "409": { description: "Revision/state conflict" }, "422": { description: "Field validation error" } } } },
    "/api/v1/submissions/{submissionId}/submit": { post: { summary: "Submit a completed form", parameters: [{ name: "submissionId", in: "path", required: true, schema: { type: "string" } }, { $ref: "#/components/parameters/EmployeeNo" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["revision"], properties: { revision: { type: "integer" } } } } } }, responses: { "200": { description: "Submitted" }, "422": { description: "Required fields are missing" } } } },
    "/api/v1/knowledge/query": { post: { summary: "Ask an authorized knowledge/analytics question", description: "The service routes to controlled structured queries, semantic retrieval, or both. Authorization is applied before retrieval.", parameters: [{ $ref: "#/components/parameters/EmployeeNo" }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["question"], properties: { question: { type: "string" } } } } } }, responses: { "200": { description: "Grounded answer with source submission references" }, "403": { description: "Knowledge access denied" } } } },
  },
  "x-api-scopes": ["forms:read", "submissions:create", "submissions:read", "submissions:message", "submissions:update", "submissions:submit", "knowledge:search"],
  "x-error-codes": ["UNAUTHORIZED", "FORBIDDEN", "FORM_NOT_FOUND", "FORM_VERSION_NOT_PUBLISHED", "SUBMISSION_NOT_FOUND", "SUBMISSION_STATE_CONFLICT", "REVISION_CONFLICT", "FIELD_VALIDATION_ERROR", "AGENT_UNAVAILABLE", "EMBEDDING_UNAVAILABLE", "VECTOR_STORE_UNAVAILABLE", "RATE_LIMIT_EXCEEDED", "API_CLIENT_DISABLED"],
} as const;
