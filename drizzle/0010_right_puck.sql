CREATE TABLE `dossivo_conversation_reads` (
	`conversation_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`last_read_sequence` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`conversation_id`, `actor_id`)
);
--> statement-breakpoint
ALTER TABLE `dossivo_conversation_messages` ADD `sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `dossivo_conversation_messages` ADD `evidence_sequence` integer;--> statement-breakpoint
ALTER TABLE `dossivo_conversation_messages` ADD `evidence_card_id` text;--> statement-breakpoint
ALTER TABLE `dossivo_conversations` ADD `last_sequence` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ranked AS (SELECT id,ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY created_at,id) AS n FROM dossivo_conversation_messages)
UPDATE dossivo_conversation_messages SET sequence=(SELECT n FROM ranked WHERE ranked.id=dossivo_conversation_messages.id);--> statement-breakpoint
UPDATE dossivo_conversations SET last_sequence=COALESCE((SELECT MAX(sequence) FROM dossivo_conversation_messages m WHERE m.conversation_id=dossivo_conversations.id),0);--> statement-breakpoint
CREATE UNIQUE INDEX `conversation_message_sequence` ON `dossivo_conversation_messages` (`conversation_id`,`sequence`);--> statement-breakpoint
