CREATE TABLE `personal_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`codename` text NOT NULL,
	`data` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_codename_user_idx` ON `personal_profiles` (`user_id`,`codename`);--> statement-breakpoint
ALTER TABLE `resumes` ADD `profile_id` text REFERENCES personal_profiles(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `resumes` ADD `profile_codename` text;
