CREATE TABLE `dossivo_summary_publications` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`card_id` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`previous_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `summary_publication_sequence` ON `dossivo_summary_publications` (`grant_id`,`sequence`);--> statement-breakpoint
ALTER TABLE `dossivo_access_events` ADD `card_id` text;--> statement-breakpoint
ALTER TABLE `dossivo_basic_grants` ADD `version_policy` text DEFAULT 'FIXED' NOT NULL;--> statement-breakpoint
ALTER TABLE `dossivo_basic_grants` ADD `publication_seq` integer DEFAULT 0 NOT NULL;