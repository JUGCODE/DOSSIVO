CREATE TABLE `dossivo_request_tasks` (
	`request_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`task_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`request_id`, `actor_id`)
);
