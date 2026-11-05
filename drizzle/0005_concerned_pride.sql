CREATE TABLE `dossivo_task_deliveries` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`task_id` text NOT NULL,
	`envelope_json` text NOT NULL,
	`envelope_hash` text NOT NULL,
	`state` text NOT NULL,
	`record_id` text,
	`record_version` integer,
	`remote_operation_id` text,
	`receipt_json` text,
	`last_error` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_task_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	CONSTRAINT "dossivo_task_cas_check" CHECK("dossivo_task_guards"."ok"=1)
);
--> statement-breakpoint
CREATE TABLE `dossivo_task_heads` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`version` integer NOT NULL,
	`last_operation_id` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `dossivo_task_owner` ON `dossivo_task_heads` (`tenant_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `dossivo_task_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`task_id` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dossivo_task_operation_key` ON `dossivo_task_operations` (`tenant_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `dossivo_task_outbox` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`task_id` text NOT NULL,
	`task_version` integer NOT NULL,
	`card_id` text NOT NULL,
	`card_hash` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_task_versions` (
	`task_id` text NOT NULL,
	`tenant_id` text NOT NULL,
	`version` integer NOT NULL,
	`body_json` text NOT NULL,
	`body_hash` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`task_id`, `version`)
);
