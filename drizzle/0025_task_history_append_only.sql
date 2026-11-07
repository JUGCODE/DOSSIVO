-- Existing history is retained unchanged. New versions remain insertable.
CREATE TRIGGER task_versions_no_update BEFORE UPDATE ON dossivo_task_versions
BEGIN SELECT RAISE(ABORT,'TASK_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER task_versions_no_delete BEFORE DELETE ON dossivo_task_versions
BEGIN SELECT RAISE(ABORT,'TASK_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
-- SQLite REPLACE may bypass delete triggers when recursive_triggers is off.
-- Reject the conflicting insert before its implicit deletion can happen.
CREATE TRIGGER task_versions_no_replace BEFORE INSERT ON dossivo_task_versions
WHEN EXISTS (SELECT 1 FROM dossivo_task_versions WHERE task_id=NEW.task_id AND version=NEW.version)
BEGIN SELECT RAISE(ABORT,'TASK_HISTORY_APPEND_ONLY'); END;
