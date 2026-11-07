-- Published summaries are historical disclosures, never editable drafts.
CREATE TRIGGER summary_publications_no_update BEFORE UPDATE ON dossivo_summary_publications
BEGIN SELECT RAISE(ABORT,'PUBLICATION_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER summary_publications_no_delete BEFORE DELETE ON dossivo_summary_publications
BEGIN SELECT RAISE(ABORT,'PUBLICATION_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
CREATE TRIGGER summary_publications_no_replace BEFORE INSERT ON dossivo_summary_publications
WHEN EXISTS (SELECT 1 FROM dossivo_summary_publications WHERE id=NEW.id OR (grant_id=NEW.grant_id AND sequence=NEW.sequence))
BEGIN SELECT RAISE(ABORT,'PUBLICATION_HISTORY_APPEND_ONLY'); END;
--> statement-breakpoint
-- Grant identity, original snapshot and agreed scope remain fixed. Lifecycle
-- columns redeemed_by, redeemed_at, revoked_at and publication_seq still update.
CREATE TRIGGER basic_grants_snapshot_no_update BEFORE UPDATE ON dossivo_basic_grants
WHEN OLD.id IS NOT NEW.id OR OLD.owner_id IS NOT NEW.owner_id
 OR OLD.task_id IS NOT NEW.task_id OR OLD.card_id IS NOT NEW.card_id
 OR OLD.code_hash IS NOT NEW.code_hash OR OLD.snapshot_json IS NOT NEW.snapshot_json
 OR OLD.snapshot_hash IS NOT NEW.snapshot_hash OR OLD.choice_json IS NOT NEW.choice_json
 OR OLD.created_at IS NOT NEW.created_at OR OLD.expires_at IS NOT NEW.expires_at
 OR OLD.access_mode IS NOT NEW.access_mode OR OLD.purpose IS NOT NEW.purpose
 OR OLD.version_policy IS NOT NEW.version_policy
BEGIN SELECT RAISE(ABORT,'GRANT_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER basic_grants_no_delete BEFORE DELETE ON dossivo_basic_grants
BEGIN SELECT RAISE(ABORT,'GRANT_SNAPSHOT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER basic_grants_no_replace BEFORE INSERT ON dossivo_basic_grants
WHEN EXISTS (SELECT 1 FROM dossivo_basic_grants WHERE id=NEW.id OR code_hash=NEW.code_hash)
BEGIN SELECT RAISE(ABORT,'GRANT_SNAPSHOT_IMMUTABLE'); END;
