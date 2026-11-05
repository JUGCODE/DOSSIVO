CREATE TABLE `dossivo_conversation_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conversation_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`body` text NOT NULL,
	`reply_to` text,
	`created_at` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`command_hash` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_message_key` ON `dossivo_conversation_messages` (`actor_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `conversation_message_history` ON `dossivo_conversation_messages` (`conversation_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `dossivo_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`grant_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`buyer_id` text NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_grant` ON `dossivo_conversations` (`grant_id`);