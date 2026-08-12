import { NextResponse } from "next/server";
export const ERROR_STATUS: Record<string, number> = {
  UNAUTHORIZED: 401, FORBIDDEN: 403, FORM_NOT_FOUND: 404, FORM_VERSION_NOT_PUBLISHED: 409,
  SUBMISSION_NOT_FOUND: 404, SUBMISSION_STATE_CONFLICT: 409, FIELD_VALIDATION_ERROR: 422,
  AGENT_UNAVAILABLE: 503, EMBEDDING_UNAVAILABLE: 503, VECTOR_STORE_UNAVAILABLE: 503,
  RATE_LIMIT_EXCEEDED: 429, API_CLIENT_DISABLED: 401, REVISION_CONFLICT: 409, BAD_REQUEST: 400,
};
export function apiError(code: string, message?: string, details?: unknown) {
  return NextResponse.json({ error: { code, message: message ?? code, details } }, { status: ERROR_STATUS[code] ?? 500 });
}
export function toApiError(error: unknown) {
  const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
  return apiError(code, code === "INTERNAL_ERROR" ? "Unexpected server error" : undefined);
}
