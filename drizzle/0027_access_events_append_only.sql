-- Audit events may be appended; ordinary DML cannot rewrite prior access history.
CREATE TRIGGER access_events_no_update BEFORE UPDATE ON dossivo_access_events
BEGIN SELECT RAISE(ABORT,'ACCESS_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER access_events_no_delete BEFORE DELETE ON dossivo_access_events
BEGIN SELECT RAISE(ABORT,'ACCESS_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER access_events_no_replace BEFORE INSERT ON dossivo_access_events
WHEN EXISTS (SELECT 1 FROM dossivo_access_events WHERE id=NEW.id)
BEGIN SELECT RAISE(ABORT,'ACCESS_HISTORY_APPEND_ONLY'); END;
