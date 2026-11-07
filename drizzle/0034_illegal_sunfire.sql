CREATE TABLE `dossivo_test_checkout_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`draft_version` integer NOT NULL,
	`request_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`quote_json` text NOT NULL,
	`request_body` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` integer NOT NULL,
	`session_id` text,
	`checkout_url` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_checkout_draft` ON `dossivo_test_checkout_orders` (`organization_id`,`draft_version`);--> statement-breakpoint
CREATE UNIQUE INDEX `test_checkout_request` ON `dossivo_test_checkout_orders` (`actor_id`,`request_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `test_checkout_session` ON `dossivo_test_checkout_orders` (`session_id`);