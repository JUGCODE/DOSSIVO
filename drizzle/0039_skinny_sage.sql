CREATE TABLE `dossivo_workspace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`task_id` text NOT NULL,
	`action` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_workspace_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`result_id` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_workspace_results` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`version` integer NOT NULL,
	`body_json` text NOT NULL,
	`body_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_result_version` ON `dossivo_workspace_results` (`task_id`,`type`,`version`);--> statement-breakpoint
CREATE TABLE `dossivo_workspace_tasks` (
	`task_id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`title` text NOT NULL,
	`title_source` text NOT NULL,
	`pinned` integer DEFAULT 0 NOT NULL,
	`archived_at` text,
	`deleted_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `dossivo_workspace_ui` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`collapsed` integer DEFAULT 0 NOT NULL,
	`right_width` integer DEFAULT 480 NOT NULL,
	`auto_open` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER workspace_result_no_update BEFORE UPDATE ON dossivo_workspace_results BEGIN SELECT RAISE(ABORT,'RESULT_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_result_no_delete BEFORE DELETE ON dossivo_workspace_results BEGIN SELECT RAISE(ABORT,'RESULT_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_result_no_replace BEFORE INSERT ON dossivo_workspace_results WHEN EXISTS(SELECT 1 FROM dossivo_workspace_results WHERE id=NEW.id OR (task_id=NEW.task_id AND type=NEW.type AND version=NEW.version)) BEGIN SELECT RAISE(ABORT,'RESULT_APPEND_ONLY'); END;
