CREATE TABLE `dossivo_contact_attempts` (
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`bucket` integer NOT NULL,
	`attempts` integer NOT NULL,
	PRIMARY KEY(`actor_id`, `kind`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `dossivo_contact_operations` (
	`actor_id` text NOT NULL,
	`key` text NOT NULL,
	`command_hash` text NOT NULL,
	`target_id` text NOT NULL,
	PRIMARY KEY(`actor_id`, `key`)
);
--> statement-breakpoint
CREATE TABLE `dossivo_contact_profiles` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`display_name` text NOT NULL,
	`discoverable` integer NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_public_id` ON `dossivo_contact_profiles` (`public_id`);--> statement-breakpoint
CREATE TABLE `dossivo_contact_referrals` (
	`id` text PRIMARY KEY NOT NULL,
	`recommender_id` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_contact_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`requester_id` text NOT NULL,
	`recipient_id` text NOT NULL,
	`pair_key` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`responded_at` text,
	`referral_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_request_pair` ON `dossivo_contact_requests` (`pair_key`);--> statement-breakpoint
CREATE TABLE `dossivo_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`pair_key` text NOT NULL,
	`owner_id` text NOT NULL,
	`peer_id` text NOT NULL,
	`owner_blocked` integer DEFAULT 0 NOT NULL,
	`peer_blocked` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contact_pair` ON `dossivo_contacts` (`pair_key`);--> statement-breakpoint
CREATE TABLE `__new_dossivo_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text,
	`contact_id` text,
	`owner_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL,
	`last_sequence` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "conversation_one_relation" CHECK(("__new_dossivo_conversations"."grant_id" IS NOT NULL AND "__new_dossivo_conversations"."contact_id" IS NULL) OR ("__new_dossivo_conversations"."grant_id" IS NULL AND "__new_dossivo_conversations"."contact_id" IS NOT NULL))
);
--> statement-breakpoint
INSERT INTO `__new_dossivo_conversations`("id", "grant_id", "contact_id", "owner_id", "buyer_id", "status", "created_at", "last_sequence") SELECT "id", "grant_id", NULL, "owner_id", "buyer_id", "status", "created_at", "last_sequence" FROM `dossivo_conversations`;--> statement-breakpoint
DROP TABLE `dossivo_conversations`;--> statement-breakpoint
ALTER TABLE `__new_dossivo_conversations` RENAME TO `dossivo_conversations`;--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_grant` ON `dossivo_conversations` (`grant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_contact` ON `dossivo_conversations` (`contact_id`);