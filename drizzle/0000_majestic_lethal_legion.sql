CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`agent_code` text NOT NULL,
	`status` text NOT NULL,
	`input_version` integer NOT NULL,
	`output_json` text NOT NULL,
	`cost_cents` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outcome_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'defined' NOT NULL,
	`current_step` integer DEFAULT 1 NOT NULL,
	`state_json` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `proof_links` (
	`token` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`recipient` text NOT NULL,
	`expires_at` text NOT NULL,
	`remaining_views` integer DEFAULT 3 NOT NULL,
	`revoked_at` text,
	`card_version` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`step_key` text NOT NULL,
	`status` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`detail_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_steps_idempotency_key_unique` ON `workflow_steps` (`idempotency_key`);