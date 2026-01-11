import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Pipeline Runs: Tracks each execution of the trading pipeline (full or partial)
 */
export const pipelineRuns = mysqlTable("pipeline_runs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  runName: varchar("runName", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["in_progress", "completed", "failed"]).default("in_progress").notNull(),
  executionMode: mysqlEnum("executionMode", ["step_by_step", "full_pipeline"]).default("step_by_step").notNull(),
  currentStage: int("currentStage").default(0).notNull(),
  totalStages: int("totalStages").default(9).notNull(),
  metadata: json("metadata"), // Additional context about the run
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type InsertPipelineRun = typeof pipelineRuns.$inferInsert;

/**
 * Pipeline Stages: Stores individual stage execution details
 */
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  stageNumber: int("stageNumber").notNull(), // 1-9
  stageName: varchar("stageName", { length: 100 }).notNull(), // Reset, Coarse Retrieval, etc.
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "failed"]).default("pending").notNull(),
  inputs: json("inputs"), // User-provided inputs for this stage
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PipelineStage = typeof pipelineStages.$inferSelect;
export type InsertPipelineStage = typeof pipelineStages.$inferInsert;

/**
 * Stage Results: Detailed results from AI analysis of each pipeline stage
 */
export const stageResults = mysqlTable("stage_results", {
  id: int("id").autoincrement().primaryKey(),
  stageId: int("stageId").notNull(),
  analysis: text("analysis"), // LLM-generated analysis output
  recommendations: text("recommendations"), // Specific recommendations from this stage
  confidence: varchar("confidence", { length: 50 }), // Confidence level of the analysis
  signals: json("signals"), // Extracted trading signals
  riskFactors: json("riskFactors"), // Identified risk factors
  metadata: json("metadata"), // Additional stage-specific data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StageResult = typeof stageResults.$inferSelect;
export type InsertStageResult = typeof stageResults.$inferInsert;

/**
 * Trading Decisions: Final trading decisions made from pipeline analysis
 */
export const tradingDecisions = mysqlTable("trading_decisions", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  decision: varchar("decision", { length: 100 }).notNull(), // BUY, SELL, HOLD, etc.
  rationale: text("rationale"), // Explanation for the decision
  targetPrice: varchar("targetPrice", { length: 50 }),
  stopLoss: varchar("stopLoss", { length: 50 }),
  riskReward: varchar("riskReward", { length: 50 }), // Risk/reward ratio
  symbol: varchar("symbol", { length: 20 }), // Trading symbol
  quantity: varchar("quantity", { length: 50 }),
  executionStatus: mysqlEnum("executionStatus", ["pending", "executed", "cancelled"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TradingDecision = typeof tradingDecisions.$inferSelect;
export type InsertTradingDecision = typeof tradingDecisions.$inferInsert;

/**
 * Auditor Reports: Results from Collapse Auditor analysis
 */
export const auditorReports = mysqlTable("auditor_reports", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  portfolioStructure: text("portfolioStructure"), // Analysis of portfolio composition
  correlationRisk: text("correlationRisk"), // Correlation analysis between holdings
  volatilityExposure: text("volatilityExposure"), // Volatility metrics and exposure
  signalQuality: text("signalQuality"), // Quality assessment of trading signals
  narrativeDrift: text("narrativeDrift"), // Analysis of narrative consistency
  overallRiskScore: varchar("overallRiskScore", { length: 50 }), // Aggregate risk score
  recommendations: text("recommendations"), // Auditor recommendations
  criticalIssues: json("criticalIssues"), // Array of critical issues found
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditorReport = typeof auditorReports.$inferSelect;
export type InsertAuditorReport = typeof auditorReports.$inferInsert;

/**
 * Pipeline Summary: High-level summary of completed pipeline runs
 */
export const pipelineSummaries = mysqlTable("pipeline_summaries", {
  id: int("id").autoincrement().primaryKey(),
  runId: int("runId").notNull(),
  overallAnalysis: text("overallAnalysis"), // Consolidated analysis from all stages
  keyFindings: json("keyFindings"), // Array of key findings
  recommendedActions: json("recommendedActions"), // Array of recommended actions
  riskAssessment: text("riskAssessment"), // Overall risk assessment
  performanceMetrics: json("performanceMetrics"), // Performance indicators
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PipelineSummary = typeof pipelineSummaries.$inferSelect;
export type InsertPipelineSummary = typeof pipelineSummaries.$inferInsert;
