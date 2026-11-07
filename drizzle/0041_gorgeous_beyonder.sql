CREATE TABLE `dossivo_proof_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`share_id` text NOT NULL,
	`code_hash` text NOT NULL,
	`snapshot_hash` text NOT NULL,
	`layer` text NOT NULL,
	`created_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dossivo_proof_verifications_share_id_unique` ON `dossivo_proof_verifications` (`share_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `dossivo_proof_verifications_code_hash_unique` ON `dossivo_proof_verifications` (`code_hash`);--> statement-breakpoint
CREATE TABLE `dossivo_verify_limits` (
	`bucket` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verify_limit_expiry` ON `dossivo_verify_limits` (`expires_at`);
--> statement-breakpoint
CREATE TRIGGER verification_fixed_snapshot BEFORE UPDATE ON dossivo_proof_verifications WHEN NEW.id IS NOT OLD.id OR NEW.share_id IS NOT OLD.share_id OR NEW.code_hash IS NOT OLD.code_hash OR NEW.snapshot_hash IS NOT OLD.snapshot_hash OR NEW.layer IS NOT OLD.layer OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS NOT OLD.revoked_at) BEGIN SELECT RAISE(ABORT,'VERIFICATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER verification_no_delete BEFORE DELETE ON dossivo_proof_verifications BEGIN SELECT RAISE(ABORT,'VERIFICATION_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER verification_no_replace BEFORE INSERT ON dossivo_proof_verifications WHEN EXISTS(SELECT 1 FROM dossivo_proof_verifications WHERE id=NEW.id OR share_id=NEW.share_id OR code_hash=NEW.code_hash) BEGIN SELECT RAISE(ABORT,'VERIFICATION_IMMUTABLE'); END;
