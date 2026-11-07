CREATE TABLE `dossivo_private_file_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`from_state` text,
	`to_state` text NOT NULL,
	`recorded_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `private_file_events_owner_task_sequence` ON `dossivo_private_file_events` (`owner_id`,`task_id`,`sequence`);--> statement-breakpoint
CREATE TRIGGER private_file_insert_event AFTER INSERT ON dossivo_private_files
BEGIN
 INSERT INTO dossivo_private_file_events(file_id,owner_id,task_id,from_state,to_state,recorded_at)
 VALUES(NEW.id,NEW.owner_id,NEW.task_id,NULL,NEW.state,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER private_file_transition_event AFTER UPDATE OF state ON dossivo_private_files
WHEN OLD.state <> NEW.state
BEGIN
 INSERT INTO dossivo_private_file_events(file_id,owner_id,task_id,from_state,to_state,recorded_at)
 VALUES(NEW.id,NEW.owner_id,NEW.task_id,OLD.state,NEW.state,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
END;
--> statement-breakpoint
CREATE TRIGGER private_file_events_no_update BEFORE UPDATE ON dossivo_private_file_events
BEGIN SELECT RAISE(ABORT,'FILE_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER private_file_events_no_delete BEFORE DELETE ON dossivo_private_file_events
BEGIN SELECT RAISE(ABORT,'FILE_HISTORY_APPEND_ONLY'); END;
