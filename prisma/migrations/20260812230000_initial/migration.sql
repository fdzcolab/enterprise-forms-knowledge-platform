-- Initial migration generated from prisma/schema.prisma

CREATE TYPE "FormVersionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');
CREATE TYPE "FieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'INTEGER', 'DATE', 'DATETIME', 'BOOLEAN', 'SINGLE_SELECT', 'MULTI_SELECT', 'TAGS', 'EMAIL', 'PHONE', 'URL');
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PARSING', 'NEEDS_REVIEW', 'READY', 'FAILED');
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'DOCX', 'XLSX');
CREATE TYPE "SyncProvider" AS ENUM ('OPENWEBUI');
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'STALE', 'REMOVED');
CREATE TYPE "IndexStatus" AS ENUM ('PENDING', 'INDEXING', 'INDEXED', 'FAILED', 'STALE', 'REMOVED');
CREATE TYPE "AssignmentType" AS ENUM ('OPEN', 'USER', 'ROLE', 'DEPARTMENT');

CREATE TABLE "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT,
  "displayUsername" TEXT,
  "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  "image" TEXT,
  "employeeNo" TEXT,
  "departmentId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "token" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId" TEXT NOT NULL
);

CREATE TABLE "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "accountId" TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "idToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "scope" TEXT,
  "password" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Verification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "identifier" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Department" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE "Project" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL,
  "description" TEXT
);

CREATE TABLE "UserRole" (
  "userId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  PRIMARY KEY ("userId", "roleId")
);

CREATE TABLE "RolePermission" (
  "roleId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "FormDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "currentVersionId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "FormVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formDefinitionId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "status" "FormVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceFileMetadata" JSONB,
  "sourceStorageKey" TEXT,
  "instructions" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMP(3)
);

CREATE TABLE "FormFieldDefinition" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formVersionId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "fieldType" "FieldType" NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INTEGER NOT NULL,
  "section" TEXT,
  "validationRules" JSONB,
  "options" JSONB,
  "maxLength" INTEGER,
  "minValue" DOUBLE PRECISION,
  "maxValue" DOUBLE PRECISION,
  "agentInstructions" TEXT,
  "isSearchable" BOOLEAN NOT NULL DEFAULT TRUE,
  "isEmbeddable" BOOLEAN NOT NULL DEFAULT TRUE,
  "isSensitive" BOOLEAN NOT NULL DEFAULT FALSE,
  "sourceMapping" JSONB
);

CREATE TABLE "FormPermissionGrant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formDefinitionId" TEXT NOT NULL,
  "permissionId" TEXT NOT NULL,
  "userId" TEXT,
  "roleId" TEXT
);

CREATE TABLE "FormAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formDefinitionId" TEXT NOT NULL,
  "type" "AssignmentType" NOT NULL,
  "userId" TEXT,
  "roleId" TEXT,
  "departmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FormImportJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "formDefinitionId" TEXT,
  "formVersionId" TEXT,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
  "normalizedDocument" JSONB,
  "proposedSchema" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "FormSubmission" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "code" TEXT NOT NULL,
  "formDefinitionId" TEXT NOT NULL,
  "formVersionId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "departmentId" TEXT,
  "projectId" TEXT,
  "sourceSystem" TEXT,
  "externalReference" TEXT,
  "context" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT
);

CREATE TABLE "FormFieldValue" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "fieldDefinitionId" TEXT NOT NULL,
  "valueJson" JSONB NOT NULL,
  "normalizedText" TEXT,
  "confirmedByUser" BOOLEAN NOT NULL DEFAULT FALSE,
  "confidence" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ConversationSession" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "activeFieldKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Message" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "role" "MessageRole" NOT NULL,
  "content" TEXT NOT NULL,
  "clientMessageId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "FieldEvidence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "fieldValueId" TEXT NOT NULL,
  "sourceMessageId" TEXT NOT NULL,
  "evidenceText" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "modelMetadata" JSONB,
  "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "ReviewComment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "action" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "KnowledgeIndexRecord" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'QDRANT',
  "collection" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "embeddingModel" TEXT NOT NULL,
  "embeddingConfig" JSONB,
  "status" "IndexStatus" NOT NULL DEFAULT 'PENDING',
  "indexedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ExternalKnowledgeSync" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT NOT NULL,
  "provider" "SyncProvider" NOT NULL,
  "targetId" TEXT NOT NULL,
  "externalFileId" TEXT,
  "contentHash" TEXT NOT NULL,
  "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastAttemptAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "ApiClient" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "scopes" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "expiresAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "Attachment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "submissionId" TEXT,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "valueJson" JSONB NOT NULL,
  "encrypted" BOOLEAN NOT NULL DEFAULT FALSE,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "LlmUsage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "requestType" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "inputTokens" INTEGER,
  "outputTokens" INTEGER,
  "success" BOOLEAN NOT NULL,
  "errorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "actorUserId" TEXT,
  "apiClientId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX "User_username_key" ON "User" ("username");
CREATE UNIQUE INDEX "User_employeeNo_key" ON "User" ("employeeNo");
CREATE INDEX "User_departmentId_isActive_idx" ON "User" ("departmentId", "isActive");
CREATE UNIQUE INDEX "Session_token_key" ON "Session" ("token");
CREATE INDEX "Session_userId_idx" ON "Session" ("userId");
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account" ("providerId", "accountId");
CREATE INDEX "Account_userId_idx" ON "Account" ("userId");
CREATE INDEX "Verification_identifier_idx" ON "Verification" ("identifier");
CREATE UNIQUE INDEX "Department_code_key" ON "Department" ("code");
CREATE UNIQUE INDEX "Project_code_key" ON "Project" ("code");
CREATE UNIQUE INDEX "Role_name_key" ON "Role" ("name");
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission" ("key");
CREATE UNIQUE INDEX "FormDefinition_code_key" ON "FormDefinition" ("code");
CREATE UNIQUE INDEX "FormDefinition_currentVersionId_key" ON "FormDefinition" ("currentVersionId");
CREATE INDEX "FormDefinition_isActive_category_idx" ON "FormDefinition" ("isActive", "category");
CREATE UNIQUE INDEX "FormVersion_formDefinitionId_versionNumber_key" ON "FormVersion" ("formDefinitionId", "versionNumber");
CREATE INDEX "FormVersion_formDefinitionId_status_idx" ON "FormVersion" ("formDefinitionId", "status");
CREATE UNIQUE INDEX "FormFieldDefinition_formVersionId_key_key" ON "FormFieldDefinition" ("formVersionId", "key");
CREATE INDEX "FormFieldDefinition_formVersionId_order_idx" ON "FormFieldDefinition" ("formVersionId", "order");
CREATE INDEX "FormPermissionGrant_formDefinitionId_permissionId_idx" ON "FormPermissionGrant" ("formDefinitionId", "permissionId");
CREATE INDEX "FormPermissionGrant_userId_idx" ON "FormPermissionGrant" ("userId");
CREATE INDEX "FormPermissionGrant_roleId_idx" ON "FormPermissionGrant" ("roleId");
CREATE INDEX "FormAssignment_formDefinitionId_type_idx" ON "FormAssignment" ("formDefinitionId", "type");
CREATE INDEX "FormImportJob_status_createdAt_idx" ON "FormImportJob" ("status", "createdAt");
CREATE UNIQUE INDEX "FormSubmission_code_key" ON "FormSubmission" ("code");
CREATE INDEX "FormSubmission_formDefinitionId_status_idx" ON "FormSubmission" ("formDefinitionId", "status");
CREATE INDEX "FormSubmission_createdByUserId_status_idx" ON "FormSubmission" ("createdByUserId", "status");
CREATE INDEX "FormSubmission_departmentId_createdAt_idx" ON "FormSubmission" ("departmentId", "createdAt");
CREATE INDEX "FormSubmission_projectId_createdAt_idx" ON "FormSubmission" ("projectId", "createdAt");
CREATE INDEX "FormSubmission_submittedAt_idx" ON "FormSubmission" ("submittedAt");
CREATE UNIQUE INDEX "FormFieldValue_submissionId_fieldDefinitionId_key" ON "FormFieldValue" ("submissionId", "fieldDefinitionId");
CREATE INDEX "FormFieldValue_submissionId_idx" ON "FormFieldValue" ("submissionId");
CREATE INDEX "ConversationSession_submissionId_createdAt_idx" ON "ConversationSession" ("submissionId", "createdAt");
CREATE UNIQUE INDEX "Message_conversationId_clientMessageId_key" ON "Message" ("conversationId", "clientMessageId");
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message" ("conversationId", "createdAt");
CREATE INDEX "FieldEvidence_fieldValueId_idx" ON "FieldEvidence" ("fieldValueId");
CREATE INDEX "ReviewComment_submissionId_createdAt_idx" ON "ReviewComment" ("submissionId", "createdAt");
CREATE UNIQUE INDEX "KnowledgeIndexRecord_submissionId_provider_collection_key" ON "KnowledgeIndexRecord" ("submissionId", "provider", "collection");
CREATE INDEX "KnowledgeIndexRecord_status_updatedAt_idx" ON "KnowledgeIndexRecord" ("status", "updatedAt");
CREATE UNIQUE INDEX "ExternalKnowledgeSync_submissionId_provider_targetId_key" ON "ExternalKnowledgeSync" ("submissionId", "provider", "targetId");
CREATE INDEX "ExternalKnowledgeSync_provider_status_idx" ON "ExternalKnowledgeSync" ("provider", "status");
CREATE UNIQUE INDEX "ApiClient_keyPrefix_key" ON "ApiClient" ("keyPrefix");
CREATE INDEX "Attachment_submissionId_idx" ON "Attachment" ("submissionId");
CREATE INDEX "LlmUsage_requestType_createdAt_idx" ON "LlmUsage" ("requestType", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx" ON "AuditEvent" ("actorUserId", "createdAt");
CREATE INDEX "AuditEvent_apiClientId_createdAt_idx" ON "AuditEvent" ("apiClientId", "createdAt");
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent" ("entityType", "entityId");
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent" ("createdAt");
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormDefinition" ADD CONSTRAINT "FormDefinition_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormDefinition" ADD CONSTRAINT "FormDefinition_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "FormVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "FormDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormVersion" ADD CONSTRAINT "FormVersion_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormFieldDefinition" ADD CONSTRAINT "FormFieldDefinition_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormPermissionGrant" ADD CONSTRAINT "FormPermissionGrant_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "FormDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormPermissionGrant" ADD CONSTRAINT "FormPermissionGrant_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormPermissionGrant" ADD CONSTRAINT "FormPermissionGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormPermissionGrant" ADD CONSTRAINT "FormPermissionGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "FormDefinition" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormAssignment" ADD CONSTRAINT "FormAssignment_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormImportJob" ADD CONSTRAINT "FormImportJob_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "FormDefinition" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormImportJob" ADD CONSTRAINT "FormImportJob_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formDefinitionId_fkey" FOREIGN KEY ("formDefinitionId") REFERENCES "FormDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formVersionId_fkey" FOREIGN KEY ("formVersionId") REFERENCES "FormVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormFieldValue" ADD CONSTRAINT "FormFieldValue_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FormFieldValue" ADD CONSTRAINT "FormFieldValue_fieldDefinitionId_fkey" FOREIGN KEY ("fieldDefinitionId") REFERENCES "FormFieldDefinition" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ConversationSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldEvidence" ADD CONSTRAINT "FieldEvidence_fieldValueId_fkey" FOREIGN KEY ("fieldValueId") REFERENCES "FormFieldValue" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FieldEvidence" ADD CONSTRAINT "FieldEvidence_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewComment" ADD CONSTRAINT "ReviewComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "KnowledgeIndexRecord" ADD CONSTRAINT "KnowledgeIndexRecord_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalKnowledgeSync" ADD CONSTRAINT "ExternalKnowledgeSync_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "FormSubmission" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_apiClientId_fkey" FOREIGN KEY ("apiClientId") REFERENCES "ApiClient" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
