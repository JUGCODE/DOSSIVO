import { sql } from "drizzle-orm";
import { check, primaryKey, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const outcomeCases = sqliteTable("outcome_cases", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  title: text("title").notNull(),
  status: text("status").notNull().default("defined"),
  currentStep: integer("current_step").notNull().default(1),
  stateJson: text("state_json").notNull(),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const workflowSteps = sqliteTable("workflow_steps", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  stepKey: text("step_key").notNull(),
  status: text("status").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  detailJson: text("detail_json").notNull(),
  createdAt: text("created_at").notNull(),
});

export const agentRuns = sqliteTable("agent_runs", {
  id: text("id").primaryKey(),
  caseId: text("case_id").notNull(),
  agentCode: text("agent_code").notNull(),
  status: text("status").notNull(),
  inputVersion: integer("input_version").notNull(),
  outputJson: text("output_json").notNull(),
  costCents: integer("cost_cents").notNull().default(0),
  createdAt: text("created_at").notNull(),
});

export const proofLinks = sqliteTable("proof_links", {
  token: text("token").primaryKey(),
  caseId: text("case_id").notNull(),
  recipient: text("recipient").notNull(),
  expiresAt: text("expires_at").notNull(),
  remainingViews: integer("remaining_views").notNull().default(3),
  revokedAt: text("revoked_at"),
  cardVersion: integer("card_version").notNull(),
  cardSnapshotJson: text("card_snapshot_json").notNull().default("{}"),
  scopeSnapshotJson: text("scope_snapshot_json").notNull().default("{}"),
  selectedFieldsJson: text("selected_fields_json").notNull().default('["card","scope"]'),
  disclosureAt: text("disclosure_at"),
  createdAt: text("created_at").notNull(),
});

export const proofAccessLogs = sqliteTable("proof_access_logs", {
  id: text("id").primaryKey(),
  token: text("token").notNull(),
  caseId: text("case_id").notNull(),
  visitorLabel: text("visitor_label"),
  cardVersion: integer("card_version").notNull(),
  viewedAt: text("viewed_at").notNull(),
}, (table) => [index("idx_proof_access_logs_case_viewed").on(table.caseId, table.viewedAt)]);

export const evidenceVersions = sqliteTable("evidence_versions", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  evidenceType: text("evidence_type").notNull(),
  version: integer("version").notNull(),
  validFrom: text("valid_from").notNull(),
  validUntil: text("valid_until"),
  productionFrom: text("production_from"),
  productionUntil: text("production_until"),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_evidence_versions_identity_version").on(table.tenantId, table.entityType, table.entityId, table.evidenceType, table.version),
  index("idx_evidence_versions_timepoint").on(table.tenantId, table.entityType, table.entityId, table.evidenceType, table.validFrom, table.validUntil),
]);

export const newsletterIssues = sqliteTable("newsletter_issues", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  editionDate: text("edition_date").notNull(),
  status: text("status").notNull().default("draft"),
  canonicalFactsJson: text("canonical_facts_json").notNull().default("{}"),
  sourceCutoffAt: text("source_cutoff_at").notNull(),
  publishedAt: text("published_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_newsletter_issues_slug").on(table.slug),
  index("idx_newsletter_issues_status_date").on(table.status, table.editionDate),
]);

export const newsletterIssueLocales = sqliteTable("newsletter_issue_locales", {
  id: text("id").primaryKey(),
  issueId: text("issue_id").notNull(),
  locale: text("locale").notNull(),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  contentJson: text("content_json").notNull(),
  checksum: text("checksum").notNull(),
  version: integer("version").notNull().default(1),
  reviewedAt: text("reviewed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("idx_newsletter_locale_issue_language").on(table.issueId, table.locale),
  index("idx_newsletter_locales_issue").on(table.issueId),
]);

export const newsletterSubscriptions = sqliteTable("newsletter_subscriptions", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  locale: text("locale").notNull(),
  status: text("status").notNull().default("pending_delivery"),
  consentVersion: text("consent_version").notNull(),
  consentSource: text("consent_source").notNull(),
  consentedAt: text("consented_at").notNull(),
  confirmedAt: text("confirmed_at"),
  unsubscribedAt: text("unsubscribed_at"),
  unsubscribeTokenHash: text("unsubscribe_token_hash"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const newsletterDeliveries = sqliteTable("newsletter_deliveries", {
  id: text("id").primaryKey(),
  issueId: text("issue_id").notNull(),
  userId: text("user_id").notNull(),
  locale: text("locale").notNull(),
  status: text("status").notNull(),
  providerMessageId: text("provider_message_id"),
  attemptedAt: text("attempted_at"),
  errorCode: text("error_code"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_newsletter_delivery_issue_user").on(table.issueId, table.userId),
  index("idx_newsletter_delivery_status").on(table.status, table.createdAt),
]);

// DOSSIVO drafts/outbox. PACI owns its eventual records, logs and adjudications.
export const paciDossierSnapshots = sqliteTable("paci_dossier_snapshots", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  caseId: text("case_id").notNull(),
  caseVersion: integer("case_version").notNull(),
  manifestJson: text("manifest_json").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("idx_paci_snapshot_case_version").on(table.tenantId, table.caseId, table.caseVersion)]);

export const paciBridgeRequests = sqliteTable("paci_bridge_requests", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  caseId: text("case_id").notNull(),
  caseVersion: integer("case_version").notNull(),
  operation: text("operation").notNull(),
  status: text("status").notNull().default("PENDING"),
  idempotencyKey: text("idempotency_key").notNull(),
  commandHash: text("command_hash").notNull(),
  targetId: text("target_id").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_paci_request_tenant_key").on(table.tenantId, table.idempotencyKey),
  index("idx_paci_request_case_status").on(table.tenantId, table.caseId, table.status),
]);

export const paciBridgeChallenges = sqliteTable("paci_bridge_challenges", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  caseId: text("case_id").notNull(),
  snapshotId: text("snapshot_id").notNull(),
  openedBy: text("opened_by").notNull(),
  reason: text("reason").notNull(),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_paci_challenge_case").on(table.tenantId, table.caseId)]);

export const paciChallengeEvents = sqliteTable("paci_challenge_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  caseId: text("case_id").notNull(),
  challengeId: text("challenge_id").notNull(),
  kind: text("kind").notNull(),
  sequence: integer("sequence").notNull(),
  actorId: text("actor_id").notNull(),
  comment: text("comment").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("idx_paci_challenge_sequence").on(table.challengeId, table.sequence),
  index("idx_paci_challenge_event_case").on(table.tenantId, table.caseId),
]);

export const paciRegistrationDeliveries = sqliteTable("paci_registration_deliveries", {
  requestId: text("request_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  caseId: text("case_id").notNull(),
  snapshotId: text("snapshot_id").notNull(),
  caseVersion: integer("case_version").notNull(),
  envelopeJson: text("envelope_json").notNull(),
  envelopeHash: text("envelope_hash").notNull(),
  state: text("state").notNull(),
  recordId: text("record_id"),
  recordVersion: integer("record_version"),
  operationId: text("operation_id"),
  receiptJson: text("receipt_json"),
  lastErrorCode: text("last_error_code"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_paci_delivery_tenant_case").on(table.tenantId, table.caseId)]);

// DOSSIVO private synthetic task workflow. Versions are append-only at the application boundary.
export const dossivoTaskHeads = sqliteTable('dossivo_task_heads', {
  id:text('id').primaryKey().notNull(), tenantId:text('tenant_id').notNull(), title:text('title').notNull(), version:integer('version').notNull(), lastOperationId:text('last_operation_id').notNull(), updatedAt:text('updated_at').notNull(),
},t=>[index('dossivo_task_owner').on(t.tenantId,t.updatedAt)]);
export const dossivoTaskVersions=sqliteTable('dossivo_task_versions',{
  taskId:text('task_id').notNull(),tenantId:text('tenant_id').notNull(),version:integer('version').notNull(),bodyJson:text('body_json').notNull(),bodyHash:text('body_hash').notNull(),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.taskId,t.version]})]);
export const dossivoTaskOperations=sqliteTable('dossivo_task_operations',{
  id:text('id').primaryKey().notNull(),tenantId:text('tenant_id').notNull(),idempotencyKey:text('idempotency_key').notNull(),commandHash:text('command_hash').notNull(),taskId:text('task_id').notNull(),version:integer('version').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('dossivo_task_operation_key').on(t.tenantId,t.idempotencyKey)]);
export const dossivoTaskGuards=sqliteTable('dossivo_task_guards',{
  id:text('id').primaryKey().notNull(),ok:integer('ok').notNull(),
},t=>[check('dossivo_task_cas_check',sql`${t.ok}=1`)]);
export const dossivoTaskOutbox=sqliteTable('dossivo_task_outbox',{
  operationId:text('operation_id').primaryKey().notNull(),tenantId:text('tenant_id').notNull(),taskId:text('task_id').notNull(),taskVersion:integer('task_version').notNull(),cardId:text('card_id').notNull(),cardHash:text('card_hash').notNull(),state:text('state').notNull(),createdAt:text('created_at').notNull(),
});
export const dossivoTaskDeliveries=sqliteTable('dossivo_task_deliveries',{
  operationId:text('operation_id').primaryKey().notNull(),tenantId:text('tenant_id').notNull(),taskId:text('task_id').notNull(),envelopeJson:text('envelope_json').notNull(),envelopeHash:text('envelope_hash').notNull(),state:text('state').notNull(),recordId:text('record_id'),recordVersion:integer('record_version'),remoteOperationId:text('remote_operation_id'),receiptJson:text('receipt_json'),lastError:text('last_error'),updatedAt:text('updated_at').notNull(),
});

export const dossivoBasicGrants=sqliteTable('dossivo_basic_grants',{
 id:text('id').primaryKey().notNull(),ownerId:text('owner_id').notNull(),taskId:text('task_id').notNull(),cardId:text('card_id').notNull(),codeHash:text('code_hash').notNull(),snapshotJson:text('snapshot_json').notNull(),snapshotHash:text('snapshot_hash').notNull(),choiceJson:text('choice_json').notNull(),createdAt:text('created_at').notNull(),expiresAt:text('expires_at').notNull(),accessMode:text('access_mode').notNull().default('TEMPORARY'),purpose:text('purpose').notNull().default('COMPLIANCE_REVIEW'),versionPolicy:text('version_policy').notNull().default('FIXED'),publicationSeq:integer('publication_seq').notNull().default(0),revokedAt:text('revoked_at'),redeemedBy:text('redeemed_by'),redeemedAt:text('redeemed_at'),
},t=>[uniqueIndex('basic_code_hash').on(t.codeHash),index('basic_owner').on(t.ownerId,t.taskId),index('basic_buyer').on(t.redeemedBy,t.expiresAt)]);
export const dossivoAccessOperations=sqliteTable('dossivo_access_operations',{
 id:text('id').primaryKey().notNull(),actorId:text('actor_id').notNull(),idempotencyKey:text('idempotency_key').notNull(),commandHash:text('command_hash').notNull(),grantId:text('grant_id').notNull(),
},t=>[uniqueIndex('access_operation_key').on(t.actorId,t.idempotencyKey)]);
export const dossivoAccessEvents=sqliteTable('dossivo_access_events',{
 id:text('id').primaryKey().notNull(),grantId:text('grant_id').notNull(),actorId:text('actor_id').notNull(),kind:text('kind').notNull(),createdAt:text('created_at').notNull(),cardId:text('card_id'),
},t=>[index('access_event_grant').on(t.grantId,t.createdAt)]);
export const dossivoAccessAttempts=sqliteTable('dossivo_access_attempts',{
 actorId:text('actor_id').notNull(),bucket:integer('bucket').notNull(),attempts:integer('attempts').notNull(),
},t=>[primaryKey({columns:[t.actorId,t.bucket]})]);

export const dossivoSummaryPublications=sqliteTable('dossivo_summary_publications',{
 id:text('id').primaryKey().notNull(),grantId:text('grant_id').notNull(),sequence:integer('sequence').notNull(),cardId:text('card_id').notNull(),snapshotJson:text('snapshot_json').notNull(),snapshotHash:text('snapshot_hash').notNull(),previousHash:text('previous_hash').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('summary_publication_sequence').on(t.grantId,t.sequence)]);

export const dossivoConversations=sqliteTable('dossivo_conversations',{
 id:text('id').primaryKey().notNull(),grantId:text('grant_id'),contactId:text('contact_id'),ownerId:text('owner_id').notNull(),buyerId:text('buyer_id').notNull(),status:text('status').notNull().default('ACTIVE'),createdAt:text('created_at').notNull(),lastSequence:integer('last_sequence').notNull().default(0),
},t=>[uniqueIndex('conversation_grant').on(t.grantId),uniqueIndex('conversation_contact').on(t.contactId),check('conversation_one_relation',sql`(${t.grantId} IS NOT NULL AND ${t.contactId} IS NULL) OR (${t.grantId} IS NULL AND ${t.contactId} IS NOT NULL)`)]);
export const dossivoConversationMessages=sqliteTable('dossivo_conversation_messages',{
 id:text('id').primaryKey().notNull(),conversationId:text('conversation_id').notNull(),actorId:text('actor_id').notNull(),kind:text('kind').notNull(),body:text('body').notNull(),replyTo:text('reply_to'),sequence:integer('sequence').notNull().default(0),evidenceSequence:integer('evidence_sequence'),evidenceCardId:text('evidence_card_id'),evidenceGrantId:text('evidence_grant_id'),structuredJson:text('structured_json'),createdAt:text('created_at').notNull(),idempotencyKey:text('idempotency_key').notNull(),commandHash:text('command_hash').notNull(),
},t=>[uniqueIndex('conversation_message_key').on(t.actorId,t.idempotencyKey),index('conversation_message_history').on(t.conversationId,t.createdAt),uniqueIndex('conversation_message_sequence').on(t.conversationId,t.sequence)]);

export const dossivoConversationReads=sqliteTable('dossivo_conversation_reads',{
 conversationId:text('conversation_id').notNull(),actorId:text('actor_id').notNull(),lastReadSequence:integer('last_read_sequence').notNull().default(0),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.conversationId,t.actorId]})]);

export const dossivoContactProfiles=sqliteTable('dossivo_contact_profiles',{
 actorId:text('actor_id').primaryKey().notNull(),publicId:text('public_id').notNull(),displayName:text('display_name').notNull(),discoverable:integer('discoverable').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[uniqueIndex('contact_public_id').on(t.publicId)]);
export const dossivoContactRequests=sqliteTable('dossivo_contact_requests',{
 id:text('id').primaryKey().notNull(),requesterId:text('requester_id').notNull(),recipientId:text('recipient_id').notNull(),pairKey:text('pair_key').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),respondedAt:text('responded_at'),referralId:text('referral_id'),
},t=>[uniqueIndex('contact_request_pair').on(t.pairKey)]);
export const dossivoContacts=sqliteTable('dossivo_contacts',{
 id:text('id').primaryKey().notNull(),pairKey:text('pair_key').notNull(),ownerId:text('owner_id').notNull(),peerId:text('peer_id').notNull(),ownerBlocked:integer('owner_blocked').notNull().default(0),peerBlocked:integer('peer_blocked').notNull().default(0),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('contact_pair').on(t.pairKey)]);
export const dossivoContactOperations=sqliteTable('dossivo_contact_operations',{
 actorId:text('actor_id').notNull(),key:text('key').notNull(),commandHash:text('command_hash').notNull(),targetId:text('target_id').notNull(),
},t=>[primaryKey({columns:[t.actorId,t.key]})]);
export const dossivoContactAttempts=sqliteTable('dossivo_contact_attempts',{
 actorId:text('actor_id').notNull(),kind:text('kind').notNull(),bucket:integer('bucket').notNull(),attempts:integer('attempts').notNull(),
},t=>[primaryKey({columns:[t.actorId,t.kind,t.bucket]})]);
export const dossivoContactReferrals=sqliteTable('dossivo_contact_referrals',{
 id:text('id').primaryKey().notNull(),recommenderId:text('recommender_id').notNull(),targetId:text('target_id').notNull(),createdAt:text('created_at').notNull(),
});

export const dossivoCommunicationRegions=sqliteTable('dossivo_communication_regions',{
 actorId:text('actor_id').primaryKey().notNull(),serviceRegion:text('service_region').notNull(),declarationVersion:text('declaration_version').notNull(),confirmedAt:text('confirmed_at').notNull(),
});

export const dossivoRequestTasks=sqliteTable('dossivo_request_tasks',{
 requestId:text('request_id').notNull(),actorId:text('actor_id').notNull(),taskId:text('task_id').notNull(),createdAt:text('created_at').notNull(),
},t=>[primaryKey({columns:[t.requestId,t.actorId]})]);

// Account-level deployment interest only; never a live storage configuration.
export const dossivoStoragePreferences=sqliteTable('dossivo_storage_preferences',{
 actorId:text('actor_id').primaryKey().notNull(),preference:text('preference').notNull(),version:integer('version').notNull(),updatedAt:text('updated_at').notNull(),
});

export const dossivoAccountContacts=sqliteTable('dossivo_account_contacts',{
 actorId:text('actor_id').primaryKey().notNull(),email:text('email').notNull(),phone:text('phone').notNull(),version:integer('version').notNull(),updatedAt:text('updated_at').notNull(),consentVersion:text('consent_version'),confirmedAt:text('confirmed_at'),
});

// Explicit recipient/version approvals; ordinary authentication never grants access.
export const dossivoPartnerContractAccess=sqliteTable('dossivo_partner_contract_access',{
 recipientId:text('recipient_id').notNull(),contractType:text('contract_type').notNull(),contractVersion:text('contract_version').notNull(),approvedBy:text('approved_by').notNull(),approvedAt:text('approved_at').notNull(),expiresAt:text('expires_at').notNull(),revokedAt:text('revoked_at'),
},t=>[primaryKey({columns:[t.recipientId,t.contractType,t.contractVersion]})]);

export const dossivoPartnerContractDocuments=sqliteTable('dossivo_partner_contract_documents',{
 contractType:text('contract_type').notNull(),
 contractVersion:text('contract_version').notNull(),
 language:text('language').notNull(),
 bodyJson:text('body_json').notNull(),
},t=>[primaryKey({columns:[t.contractType,t.contractVersion,t.language]})]);

// Metadata only: never store contract bodies in the audit trail.
export const dossivoPartnerContractAudit=sqliteTable('dossivo_partner_contract_audit',{
 operationId:text('operation_id').primaryKey().notNull(),actorId:text('actor_id').notNull(),action:text('action').notNull(),contractType:text('contract_type').notNull(),contractVersion:text('contract_version').notNull(),language:text('language').notNull(),recipientId:text('recipient_id').notNull(),createdAt:text('created_at').notNull(),
});

export const dossivoPartnerApplications=sqliteTable('dossivo_partner_applications',{
 actorId:text('actor_id').notNull(),partnerType:text('partner_type').notNull(),revision:integer('revision').notNull(),status:text('status').notNull(),profileJson:text('profile_json').notNull(),reason:text('reason').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[primaryKey({columns:[t.actorId,t.partnerType]}),index('partner_application_queue').on(t.status,t.updatedAt)]);
export const dossivoPartnerApplicationEvents=sqliteTable('dossivo_partner_application_events',{
 operationId:text('operation_id').primaryKey().notNull(),ownerId:text('owner_id').notNull(),partnerType:text('partner_type').notNull(),revision:integer('revision').notNull(),actorId:text('actor_id').notNull(),action:text('action').notNull(),status:text('status').notNull(),reason:text('reason').notNull(),createdAt:text('created_at').notNull(),
},t=>[uniqueIndex('partner_application_event_revision').on(t.ownerId,t.partnerType,t.revision)]);
