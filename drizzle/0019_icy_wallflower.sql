CREATE TABLE `dossivo_partner_contract_access` (
	`recipient_id` text NOT NULL,
	`contract_type` text NOT NULL,
	`contract_version` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	PRIMARY KEY(`recipient_id`, `contract_type`, `contract_version`)
);
