CREATE TABLE `dossivo_private_files` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`request_key` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`media_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`state` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "private_file_state" CHECK("dossivo_private_files"."state" in ('UPLOADING','STORED_UNREVIEWED','DELETING','DELETED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `private_file_request` ON `dossivo_private_files` (`owner_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `private_file_owner_task` ON `dossivo_private_files` (`owner_id`,`task_id`);