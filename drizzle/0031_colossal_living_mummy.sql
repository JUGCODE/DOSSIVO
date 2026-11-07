CREATE TABLE `dossivo_subscription_drafts` (
	`organization_id` text NOT NULL,
	`version` integer NOT NULL,
	`actor_id` text NOT NULL,
	`request_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`quote_json` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `version`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_draft_request` ON `dossivo_subscription_drafts` (`actor_id`,`request_key`);