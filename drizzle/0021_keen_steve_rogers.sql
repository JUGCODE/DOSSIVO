CREATE TABLE `dossivo_partner_contract_audit` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`contract_type` text NOT NULL,
	`contract_version` text NOT NULL,
	`language` text NOT NULL,
	`recipient_id` text NOT NULL,
	`created_at` text NOT NULL
);
