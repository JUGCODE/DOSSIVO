CREATE TABLE `dossivo_organization_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`subject_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_organization_members` (
	`organization_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`status` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `actor_id`),
	CONSTRAINT "org_member_status" CHECK("dossivo_organization_members"."status" in ('INVITED','ACTIVE','REVOKED'))
);
--> statement-breakpoint
CREATE INDEX `org_member_actor` ON `dossivo_organization_members` (`actor_id`,`status`);--> statement-breakpoint
CREATE TABLE `dossivo_organization_operations` (
	`actor_id` text NOT NULL,
	`request_key` text NOT NULL,
	`command_hash` text NOT NULL,
	`organization_id` text NOT NULL,
	PRIMARY KEY(`actor_id`, `request_key`)
);
--> statement-breakpoint
CREATE TABLE `dossivo_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`country` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dossivo_organizations_owner_id_unique` ON `dossivo_organizations` (`owner_id`);