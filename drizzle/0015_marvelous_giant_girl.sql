CREATE TABLE `dossivo_storage_preferences` (
	`actor_id` text PRIMARY KEY NOT NULL,
	`preference` text NOT NULL,
	`version` integer NOT NULL,
	`updated_at` text NOT NULL
);
