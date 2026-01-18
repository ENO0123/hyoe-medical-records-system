CREATE TABLE `doctors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctorId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`affiliation` varchar(255),
	`specialties` text,
	`notes` text,
	`userId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `doctors_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctors_doctorId_unique` UNIQUE(`doctorId`),
	CONSTRAINT `doctors_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patientId` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameKana` varchar(255),
	`gender` enum('男','女','その他') NOT NULL,
	`birthDate` date NOT NULL,
	`phone` varchar(20),
	`email` varchar(320),
	`address` text,
	`doctorId` int NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`),
	CONSTRAINT `patients_patientId_unique` UNIQUE(`patientId`)
);
--> statement-breakpoint
CREATE TABLE `testItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemCode` varchar(64) NOT NULL,
	`itemName` varchar(255) NOT NULL,
	`category` enum('糖尿','貧血','血液','尿','身長体重','その他') NOT NULL,
	`unit` varchar(50) NOT NULL,
	`referenceMin` decimal(10,2),
	`referenceMax` decimal(10,2),
	`displayOrder` int DEFAULT 0,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `testItems_itemCode_unique` UNIQUE(`itemCode`)
);
--> statement-breakpoint
CREATE TABLE `testResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resultId` varchar(64) NOT NULL,
	`patientId` int NOT NULL,
	`visitId` int,
	`testDate` date NOT NULL,
	`itemId` int NOT NULL,
	`resultValue` decimal(10,2) NOT NULL,
	`resultComment` text,
	`additionalComment` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `testResults_id` PRIMARY KEY(`id`),
	CONSTRAINT `testResults_resultId_unique` UNIQUE(`resultId`)
);
--> statement-breakpoint
CREATE TABLE `visits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` varchar(64) NOT NULL,
	`patientId` int NOT NULL,
	`visitDate` date NOT NULL,
	`visitType` enum('定期健診','突発的受診','その他') NOT NULL,
	`diagnosis` text,
	`chiefComplaint` text,
	`findings` text,
	`treatment` text,
	`prescription` text,
	`notes` text,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `visits_id` PRIMARY KEY(`id`),
	CONSTRAINT `visits_visitId_unique` UNIQUE(`visitId`)
);
--> statement-breakpoint
ALTER TABLE `doctors` ADD CONSTRAINT `doctors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `patients` ADD CONSTRAINT `patients_doctorId_doctors_id_fk` FOREIGN KEY (`doctorId`) REFERENCES `doctors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_visitId_visits_id_fk` FOREIGN KEY (`visitId`) REFERENCES `visits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_itemId_testItems_id_fk` FOREIGN KEY (`itemId`) REFERENCES `testItems`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `testResults` ADD CONSTRAINT `testResults_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `visits_patientId_patients_id_fk` FOREIGN KEY (`patientId`) REFERENCES `patients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `visits` ADD CONSTRAINT `visits_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;