-- 薬歴テーブルを追加
CREATE TABLE `medications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`medicationId` varchar(64) NOT NULL,
	`patientId` int NOT NULL,
	`medicationName` varchar(255) NOT NULL,
	`startDate` date NOT NULL,
	`endDate` date,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `medications_id` PRIMARY KEY(`id`),
	CONSTRAINT `medications_medicationId_unique` UNIQUE(`medicationId`)
);
--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
