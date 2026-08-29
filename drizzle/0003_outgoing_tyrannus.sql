ALTER TABLE `ecdatAssumptions` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecdatAssumptions` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ecdatMigrationWaves` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecdatRecommendations` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecdatRecommendations` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `ecdatRelationships` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `ecdatScans` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
CREATE INDEX `ecdatAssumptions_scanKey_idx` ON `ecdatAssumptions` (`scanKey`);--> statement-breakpoint
CREATE INDEX `ecdatMigrationWaves_scanKey_idx` ON `ecdatMigrationWaves` (`scanKey`);--> statement-breakpoint
CREATE INDEX `ecdatRecommendations_scanKey_idx` ON `ecdatRecommendations` (`scanKey`);--> statement-breakpoint
CREATE INDEX `ecdatRecommendations_findingKey_idx` ON `ecdatRecommendations` (`findingKey`);--> statement-breakpoint
CREATE INDEX `ecdatRelationships_scanKey_idx` ON `ecdatRelationships` (`scanKey`);--> statement-breakpoint
CREATE INDEX `ecdatScans_userId_idx` ON `ecdatScans` (`userId`);