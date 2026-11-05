CREATE TABLE `newsletter_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`user_id` text NOT NULL,
	`locale` text NOT NULL,
	`status` text NOT NULL,
	`provider_message_id` text,
	`attempted_at` text,
	`error_code` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_delivery_issue_user` ON `newsletter_deliveries` (`issue_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_delivery_status` ON `newsletter_deliveries` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `newsletter_issue_locales` (
	`id` text PRIMARY KEY NOT NULL,
	`issue_id` text NOT NULL,
	`locale` text NOT NULL,
	`subject` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`content_json` text NOT NULL,
	`checksum` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`reviewed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_locale_issue_language` ON `newsletter_issue_locales` (`issue_id`,`locale`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_locales_issue` ON `newsletter_issue_locales` (`issue_id`);--> statement-breakpoint
CREATE TABLE `newsletter_issues` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`edition_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`canonical_facts_json` text DEFAULT '{}' NOT NULL,
	`source_cutoff_at` text NOT NULL,
	`published_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_newsletter_issues_slug` ON `newsletter_issues` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_newsletter_issues_status_date` ON `newsletter_issues` (`status`,`edition_date`);--> statement-breakpoint
CREATE TABLE `newsletter_subscriptions` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`locale` text NOT NULL,
	`status` text DEFAULT 'pending_delivery' NOT NULL,
	`consent_version` text NOT NULL,
	`consent_source` text NOT NULL,
	`consented_at` text NOT NULL,
	`confirmed_at` text,
	`unsubscribed_at` text,
	`unsubscribe_token_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
