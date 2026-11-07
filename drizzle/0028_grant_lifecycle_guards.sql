-- Revocation is final for this grant; renewed access requires a new grant.
CREATE TRIGGER basic_grants_revocation_final BEFORE UPDATE ON dossivo_basic_grants
WHEN OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at
BEGIN SELECT RAISE(ABORT,'GRANT_REVOCATION_FINAL'); END;
--> statement-breakpoint
-- Keep an already redeemed buyer and its receipt timestamp fixed. A revoked
-- unredeemed grant cannot be claimed later. Unchanged legacy rows are not rewritten.
CREATE TRIGGER basic_grants_redemption_fixed BEFORE UPDATE ON dossivo_basic_grants
WHEN (NEW.redeemed_by IS NOT OLD.redeemed_by OR NEW.redeemed_at IS NOT OLD.redeemed_at)
 AND (OLD.redeemed_by IS NOT NULL OR OLD.revoked_at IS NOT NULL
      OR (NEW.redeemed_by IS NULL) <> (NEW.redeemed_at IS NULL)
      OR NEW.redeemed_by = '' OR NEW.redeemed_at = '')
BEGIN SELECT RAISE(ABORT,'GRANT_REDEMPTION_FIXED'); END;
