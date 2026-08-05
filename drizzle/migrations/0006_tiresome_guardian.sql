ALTER TABLE `resumes` ADD `parent_id` text REFERENCES resumes(id);--> statement-breakpoint
ALTER TABLE `resumes` ADD `derived_at` integer;