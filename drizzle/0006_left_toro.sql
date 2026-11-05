CREATE TABLE `dossivo_access_attempts` (
	`actor_id` text NOT NULL,
	`bucket` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`actor_id`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `dossivo_access_events` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `access_event_grant` ON `dossivo_access_events` (`grant_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `dossivo_access_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`grant_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_operation_key` ON `dossivo_access_operations` (`actor_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `dossivo_basic_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`card_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`choice_json` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`redeemed_by` text,
	`redeemed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `basic_code_hash` ON `dossivo_basic_grants` (`code_hash`);--> statement-breakpoint
CREATE INDEX `basic_owner` ON `dossivo_basic_grants` (`owner_id`,`task_id`);--> statement-breakpoint
CREATE INDEX `basic_buyer` ON `dossivo_basic_grants` (`redeemed_by`,`expires_at`);