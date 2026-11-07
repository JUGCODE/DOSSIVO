CREATE TABLE `dossivo_payment_test_receipts` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`object_id` text NOT NULL,
	`payload_hash` text NOT NULL,
	`event_created` integer NOT NULL,
	`received_at` text NOT NULL
);
