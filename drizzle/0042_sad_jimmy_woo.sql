CREATE TABLE `dossivo_proof_verification_bindings` (
	`registry_id` text PRIMARY KEY NOT NULL,
	`proof_token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `dossivo_proof_verification_bindings_proof_token_unique` ON `dossivo_proof_verification_bindings` (`proof_token`);--> statement-breakpoint
CREATE TRIGGER proof_binding_no_update BEFORE UPDATE ON dossivo_proof_verification_bindings BEGIN SELECT RAISE(ABORT,'PROOF_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER proof_binding_no_delete BEFORE DELETE ON dossivo_proof_verification_bindings BEGIN SELECT RAISE(ABORT,'PROOF_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER proof_binding_no_replace BEFORE INSERT ON dossivo_proof_verification_bindings WHEN EXISTS(SELECT 1 FROM dossivo_proof_verification_bindings WHERE registry_id=NEW.registry_id OR proof_token=NEW.proof_token) BEGIN SELECT RAISE(ABORT,'PROOF_BINDING_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER bound_proof_snapshot_fixed BEFORE UPDATE ON proof_links WHEN EXISTS(SELECT 1 FROM dossivo_proof_verification_bindings WHERE proof_token=OLD.token) AND (NEW.token IS NOT OLD.token OR NEW.case_id IS NOT OLD.case_id OR NEW.card_version IS NOT OLD.card_version OR NEW.card_snapshot_json IS NOT OLD.card_snapshot_json OR NEW.scope_snapshot_json IS NOT OLD.scope_snapshot_json OR NEW.selected_fields_json IS NOT OLD.selected_fields_json OR NEW.expires_at IS NOT OLD.expires_at OR NEW.created_at IS NOT OLD.created_at OR NEW.recipient IS NOT OLD.recipient) BEGIN SELECT RAISE(ABORT,'BOUND_PROOF_IMMUTABLE'); END;
