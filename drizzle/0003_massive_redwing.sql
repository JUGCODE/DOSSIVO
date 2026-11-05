CREATE TABLE `paci_bridge_challenges` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`case_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`opened_by` text NOT NULL,
	`reason` text NOT NULL,
	`comment` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_paci_challenge_case` ON `paci_bridge_challenges` (`tenant_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `paci_bridge_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`case_id` text NOT NULL,
	`case_version` integer NOT NULL,
	`operation` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`idempotency_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`target_id` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_paci_request_tenant_key` ON `paci_bridge_requests` (`tenant_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_paci_request_case_status` ON `paci_bridge_requests` (`tenant_id`,`case_id`,`status`);--> statement-breakpoint
CREATE TABLE `paci_challenge_events` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`case_id` text NOT NULL,
	`challenge_id` text NOT NULL,
	`kind` text NOT NULL,
	`sequence` integer NOT NULL,
	`actor_id` text NOT NULL,
	`comment` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_paci_challenge_sequence` ON `paci_challenge_events` (`challenge_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `idx_paci_challenge_event_case` ON `paci_challenge_events` (`tenant_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `paci_dossier_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`case_id` text NOT NULL,
	`case_version` integer NOT NULL,
	`manifest_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_paci_snapshot_case_version` ON `paci_dossier_snapshots` (`tenant_id`,`case_id`,`case_version`);