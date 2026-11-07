CREATE INDEX workspace_event_page ON dossivo_workspace_events(actor_id,task_id,created_at,id);
--> statement-breakpoint
CREATE TRIGGER workspace_event_no_update BEFORE UPDATE ON dossivo_workspace_events BEGIN SELECT RAISE(ABORT,'WORKSPACE_AUDIT_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_event_no_delete BEFORE DELETE ON dossivo_workspace_events BEGIN SELECT RAISE(ABORT,'WORKSPACE_AUDIT_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_event_no_replace BEFORE INSERT ON dossivo_workspace_events WHEN EXISTS(SELECT 1 FROM dossivo_workspace_events WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'WORKSPACE_AUDIT_APPEND_ONLY'); END;
