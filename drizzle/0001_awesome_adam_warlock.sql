CREATE TABLE `ecdatAssumptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`assumptionKey` varchar(96) NOT NULL,
	`label` varchar(160) NOT NULL,
	`value` varchar(64) NOT NULL,
	`unit` varchar(48) NOT NULL,
	`source` varchar(160) NOT NULL,
	`confidence` int NOT NULL,
	`userConfirmed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `ecdatAssumptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecdatFindings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`findingKey` varchar(48) NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`assetName` varchar(160) NOT NULL,
	`assetType` varchar(64) NOT NULL,
	`algorithm` varchar(128) NOT NULL,
	`cryptoRole` varchar(96) NOT NULL,
	`library` varchar(128),
	`version` varchar(64),
	`sourceLocation` varchar(255) NOT NULL,
	`usageContext` varchar(255) NOT NULL,
	`dataState` varchar(64) NOT NULL,
	`environment` varchar(64) NOT NULL,
	`sensitivity` varchar(64) NOT NULL,
	`criticality` varchar(64) NOT NULL,
	`riskLevel` varchar(32) NOT NULL,
	`classicalRisk` varchar(32) NOT NULL,
	`quantumRisk` varchar(32) NOT NULL,
	`quantumVulnerable` boolean NOT NULL,
	`hndlExposure` boolean NOT NULL,
	`dataLifetimeYears` int NOT NULL,
	`migrationMonths` int NOT NULL,
	`confidence` int NOT NULL,
	`evidence` text NOT NULL,
	`provenance` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ecdatFindings_id` PRIMARY KEY(`id`),
	CONSTRAINT `ecdatFindings_findingKey_unique` UNIQUE(`findingKey`)
);
--> statement-breakpoint
CREATE TABLE `ecdatMigrationWaves` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`wave` int NOT NULL,
	`title` varchar(160) NOT NULL,
	`rationale` text NOT NULL,
	`scope` text NOT NULL,
	`indicativeEffort` varchar(128) NOT NULL,
	`dependencies` text NOT NULL,
	CONSTRAINT `ecdatMigrationWaves_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecdatRecommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`findingKey` varchar(48) NOT NULL,
	`recommendationType` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`candidate` varchar(255) NOT NULL,
	`migrationNotes` text NOT NULL,
	`compatibility` text NOT NULL,
	`indicativeEffort` varchar(128) NOT NULL,
	`indicativeLatency` varchar(128) NOT NULL,
	`priority` int NOT NULL,
	`status` enum('open','planned','accepted') NOT NULL DEFAULT 'open',
	CONSTRAINT `ecdatRecommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecdatRelationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`sourceNode` varchar(96) NOT NULL,
	`targetNode` varchar(96) NOT NULL,
	`relationship` varchar(96) NOT NULL,
	`evidence` text NOT NULL,
	`confidence` int NOT NULL,
	CONSTRAINT `ecdatRelationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ecdatScans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`scanKey` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`repositoryUrl` text,
	`scenario` enum('python-web','java-enterprise','container-mesh','compliance-heavy') NOT NULL,
	`status` enum('completed','processing','failed') NOT NULL DEFAULT 'completed',
	`totalAssets` int NOT NULL,
	`criticalCount` int NOT NULL,
	`quantumVulnerableCount` int NOT NULL,
	`hndlCount` int NOT NULL,
	`quantumReadiness` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ecdatScans_id` PRIMARY KEY(`id`),
	CONSTRAINT `ecdatScans_scanKey_unique` UNIQUE(`scanKey`)
);
