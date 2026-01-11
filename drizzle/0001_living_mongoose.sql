CREATE TABLE `auditor_reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`portfolioStructure` text,
	`correlationRisk` text,
	`volatilityExposure` text,
	`signalQuality` text,
	`narrativeDrift` text,
	`overallRiskScore` varchar(50),
	`recommendations` text,
	`criticalIssues` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditor_reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`runName` varchar(255) NOT NULL,
	`status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
	`executionMode` enum('step_by_step','full_pipeline') NOT NULL DEFAULT 'step_by_step',
	`currentStage` int NOT NULL DEFAULT 0,
	`totalStages` int NOT NULL DEFAULT 9,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`completedAt` timestamp,
	CONSTRAINT `pipeline_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_stages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`stageNumber` int NOT NULL,
	`stageName` varchar(100) NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`inputs` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_stages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`overallAnalysis` text,
	`keyFindings` json,
	`recommendedActions` json,
	`riskAssessment` text,
	`performanceMetrics` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stage_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stageId` int NOT NULL,
	`analysis` text,
	`recommendations` text,
	`confidence` varchar(50),
	`signals` json,
	`riskFactors` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `stage_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trading_decisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`decision` varchar(100) NOT NULL,
	`rationale` text,
	`targetPrice` varchar(50),
	`stopLoss` varchar(50),
	`riskReward` varchar(50),
	`symbol` varchar(20),
	`quantity` varchar(50),
	`executionStatus` enum('pending','executed','cancelled') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trading_decisions_id` PRIMARY KEY(`id`)
);
