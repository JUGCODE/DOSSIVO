CREATE TABLE `dossivo_account_contacts` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
