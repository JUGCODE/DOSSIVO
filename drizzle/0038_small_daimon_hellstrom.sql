CREATE TABLE `dossivo_test_stop_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`attempt` integer NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`outcome` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_stop_attempt_number` ON `dossivo_test_stop_attempts` (`order_id`,`attempt`);--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_attempts` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_next_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_lease_until` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_lease_token` text;--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_last_code` text;--> statement-breakpoint
ALTER TABLE `dossivo_test_checkout_orders` ADD `retry_review` integer DEFAULT 0 NOT NULL;