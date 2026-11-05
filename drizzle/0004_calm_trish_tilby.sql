CREATE TABLE `paci_registration_deliveries` (
	`request_id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`case_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`case_version` integer NOT NULL,
	`envelope_json` text NOT NULL,
	`envelope_hash` text NOT NULL,
	`state` text NOT NULL,
	`record_id` text,
	`record_version` integer,
	`operation_id` text,
	`receipt_json` text,
	`last_error_code` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_paci_delivery_tenant_case` ON `paci_registration_deliveries` (`tenant_id`,`case_id`);