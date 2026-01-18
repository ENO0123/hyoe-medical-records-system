-- usersテーブルのroleカラムに'doctor'を追加
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','doctor') NOT NULL DEFAULT 'user';
--> statement-breakpoint

-- doctorsテーブルにloginIdとpasswordHashカラムを追加
ALTER TABLE `doctors` ADD COLUMN `loginId` varchar(64);
--> statement-breakpoint

ALTER TABLE `doctors` ADD COLUMN `passwordHash` varchar(255);
--> statement-breakpoint
