-- 患者テーブルにstatusカラムを追加
ALTER TABLE `patients` ADD COLUMN `status` enum('契約中','終了','新規') DEFAULT '新規' NOT NULL;
--> statement-breakpoint
