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
CREATE TABLE `testResultImages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`imageId` varchar(64) NOT NULL,
	`patientId` int NOT NULL,
	`testResultId` int,
	`itemId` int NOT NULL,
	`testDate` date NOT NULL,
	`imageUrl` text NOT NULL,
	`fileName` varchar(255),
	`fileSize` int,
	`mimeType` varchar(100),
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testResultImages_id` PRIMARY KEY(`id`),
	CONSTRAINT `testResultImages_imageId_unique` UNIQUE(`imageId`)
);
--> statement-breakpoint
ALTER TABLE `testItems` MODIFY COLUMN `category` enum('身体','脳・血管','肺機能','血圧','血液','脂質代謝','糖代謝','腎・尿路系','肝胆膵','内分泌','口腔','診察','循環器','呼吸器','消化器','生殖器','乳がん','腫瘍マーカー','感染症・免疫','糖尿','貧血','尿','身長体重','肝機能','腎機能','視力聴力','画像検査','その他') NOT NULL;--> statement-breakpoint
ALTER TABLE `patients` ADD `status` enum('契約中','終了','新規') DEFAULT '新規' NOT NULL;--> statement-breakpoint
ALTER TABLE `testItems` ADD `referenceMinMale` decimal(10,2);--> statement-breakpoint
ALTER TABLE `testItems` ADD `referenceMaxMale` decimal(10,2);--> statement-breakpoint
ALTER TABLE `testItems` ADD `referenceMinFemale` decimal(10,2);--> statement-breakpoint
ALTER TABLE `testItems` ADD `referenceMaxFemale` decimal(10,2);--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `medications` ADD CONSTRAINT `medications_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResultImages` ADD CONSTRAINT `testResultImages_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResultImages` ADD CONSTRAINT `testResultImages_testResultId_testResults_id_fk` FOREIGN KEY (`testResultId`) REFERENCES `testResults`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResultImages` ADD CONSTRAINT `testResultImages_itemId_testItems_id_fk` FOREIGN KEY (`itemId`) REFERENCES `testItems`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResultImages` ADD CONSTRAINT `testResultImages_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;