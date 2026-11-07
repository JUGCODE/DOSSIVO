CREATE TABLE `dossivo_partner_application_events` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`partner_type` text NOT NULL,
	`revision` integer NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partner_application_event_revision` ON `dossivo_partner_application_events` (`owner_id`,`partner_type`,`revision`);--> statement-breakpoint
CREATE TABLE `dossivo_partner_applications` (
	`actor_id` text NOT NULL,
	`partner_type` text NOT NULL,
	`revision` integer NOT NULL,
	`status` text NOT NULL,
	`profile_json` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`actor_id`, `partner_type`)
);
--> statement-breakpoint
CREATE INDEX `partner_application_queue` ON `dossivo_partner_applications` (`status`,`updated_at`);