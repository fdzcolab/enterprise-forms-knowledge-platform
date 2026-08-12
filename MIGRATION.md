# Migration from knowledge-capture-agent

The old project is a reference, not the new domain model. Migration should be a one-time ETL process rather than preserving `CaptureSession` as a universal entity.

Suggested mapping:

- existing knowledge template/schema -> `FormDefinition` named Knowledge Capture + an imported `FormVersion`
- each capture session -> `FormSubmission`
- captured fixed fields -> `FormFieldValue` mapped to the imported field definitions
- capture chat history -> `ConversationSession` + `Message`
- confirmed flags/evidence -> corresponding value/evidence records where source data supports them
- project/user references -> new project/user IDs using deterministic mapping tables

Run migration in phases: import users/projects, create the form/version, import submissions/messages/values, validate counts and ownership, then index only eligible approved records. Do not make historical migration a blocker for deployment of the clean platform.
