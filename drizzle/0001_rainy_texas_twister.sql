CREATE TABLE `evidence_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`evidence_type` text NOT NULL,
	`version` integer NOT NULL,
	`valid_from` text NOT NULL,
	`valid_until` text,
	`production_from` text,
	`production_until` text,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_versions_identity_version` ON `evidence_versions` (`tenant_id`,`entity_type`,`entity_id`,`evidence_type`,`version`);--> statement-breakpoint
CREATE INDEX `idx_evidence_versions_timepoint` ON `evidence_versions` (`tenant_id`,`entity_type`,`entity_id`,`evidence_type`,`valid_from`,`valid_until`);--> statement-breakpoint
CREATE TABLE `proof_access_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`case_id` text NOT NULL,
	`visitor_label` text,
	`card_version` integer NOT NULL,
	`viewed_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_proof_access_logs_case_viewed` ON `proof_access_logs` (`case_id`,`viewed_at`);--> statement-breakpoint
ALTER TABLE `proof_links` ADD `card_snapshot_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `proof_links` ADD `scope_snapshot_json` text DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE `proof_links` ADD `selected_fields_json` text DEFAULT '["card","scope"]' NOT NULL;--> statement-breakpoint
ALTER TABLE `proof_links` ADD `disclosure_at` text;