CREATE TABLE `dossivo_proof_issuance_receipts` (
	`registry_id` text PRIMARY KEY NOT NULL,
	`key_id` text NOT NULL,
	`region` text NOT NULL,
	`domain` text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER proof_receipt_no_update BEFORE UPDATE ON dossivo_proof_issuance_receipts BEGIN SELECT RAISE(ABORT,'PROOF_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER proof_receipt_no_delete BEFORE DELETE ON dossivo_proof_issuance_receipts BEGIN SELECT RAISE(ABORT,'PROOF_RECEIPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER proof_receipt_no_replace BEFORE INSERT ON dossivo_proof_issuance_receipts WHEN EXISTS(SELECT 1 FROM dossivo_proof_issuance_receipts WHERE registry_id=NEW.registry_id) BEGIN SELECT RAISE(ABORT,'PROOF_RECEIPT_IMMUTABLE'); END;
