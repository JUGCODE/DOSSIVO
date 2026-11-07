CREATE INDEX `organization_event_history` ON `dossivo_organization_events` (`organization_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE TRIGGER dossivo_subscription_drafts_no_update BEFORE UPDATE ON dossivo_subscription_drafts BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;

--> statement-breakpoint
CREATE TRIGGER dossivo_subscription_drafts_no_delete BEFORE DELETE ON dossivo_subscription_drafts BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;

--> statement-breakpoint
CREATE TRIGGER dossivo_subscription_drafts_no_replace BEFORE INSERT ON dossivo_subscription_drafts WHEN EXISTS(SELECT 1 FROM dossivo_subscription_drafts WHERE (organization_id=NEW.organization_id AND version=NEW.version) OR (actor_id=NEW.actor_id AND request_key=NEW.request_key)) BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;

--> statement-breakpoint
CREATE TRIGGER dossivo_organization_events_no_update BEFORE UPDATE ON dossivo_organization_events BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;

--> statement-breakpoint
CREATE TRIGGER dossivo_organization_events_no_delete BEFORE DELETE ON dossivo_organization_events BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;

--> statement-breakpoint
CREATE TRIGGER dossivo_organization_events_no_replace BEFORE INSERT ON dossivo_organization_events WHEN EXISTS(SELECT 1 FROM dossivo_organization_events WHERE id=NEW.id) BEGIN SELECT RAISE(ABORT,'HISTORY_APPEND_ONLY'); END;
