-- SQLite REPLACE may bypass DELETE triggers when recursive_triggers is off.
-- Reject conflicting history inserts before replacement can remove the old row.
CREATE TRIGGER private_file_events_no_replace BEFORE INSERT ON dossivo_private_file_events
WHEN EXISTS (SELECT 1 FROM dossivo_private_file_events WHERE sequence=NEW.sequence)
BEGIN SELECT RAISE(ABORT,'FILE_HISTORY_APPEND_ONLY'); END;
