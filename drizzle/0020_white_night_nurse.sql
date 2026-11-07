CREATE TABLE `dossivo_partner_contract_documents` (
	`contract_type` text NOT NULL,
	`contract_version` text NOT NULL,
	`language` text NOT NULL,
	`body_json` text NOT NULL,
	PRIMARY KEY(`contract_type`, `contract_version`, `language`)
);
