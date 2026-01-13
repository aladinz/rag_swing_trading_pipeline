import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, pipelineRuns, pipelineStages, stageResults, tradingDecisions, auditorReports, pipelineSummaries } from "../drizzle/schema";
import { ENV } from './_core/env';
import { mockDb } from "./mockDb";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbConnectionFailed = false;

// Helper function to check if we should use mock database
function shouldUseMockDb(): boolean {
  // Always use mock in development
  if (process.env.NODE_ENV === "development") {
    return true;
  }
  // Use mock if real DB connection failed
  if (_dbConnectionFailed) {
    return true;
  }
  // Use mock if no DATABASE_URL
  if (!process.env.DATABASE_URL) {
    return true;
  }
  return false;
}

// Log on startup
console.log(`[Database] Environment: ${process.env.NODE_ENV}, Using mock: ${shouldUseMockDb()}`);

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  // In development, always use mock database
  if (shouldUseMockDb()) {
    return null;
  }
  
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect to MySQL, using mock database:", error);
      _dbConnectionFailed = true;
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Pipeline-related query helpers

export async function createPipelineRun(userId: number | string, runName: string, executionMode: "step_by_step" | "full_pipeline", metadata?: any) {
  const userIdNum = typeof userId === 'string' ? parseInt(userId) || 1 : userId;
  
  // Always use mock database in development
  if (shouldUseMockDb()) {
    console.log("[Database] Using mock database for createPipelineRun");
    return mockDb.insertPipelineRun({
      userId: userIdNum,
      runName,
      executionMode,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: "in_progress",
      currentStage: 0,
      totalStages: 9,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    });
  }

  // Production: use real database
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db.insert(pipelineRuns).values({
    userId: userIdNum,
    runName,
    executionMode,
    metadata: metadata ? JSON.stringify(metadata) : null,
    status: "in_progress",
    currentStage: 0,
    totalStages: 9,
  });

  const runs = await db.select().from(pipelineRuns).orderBy(desc(pipelineRuns.id)).limit(1);
  if (runs.length > 0) {
    return { insertId: runs[0].id };
  }
  return result;
}

export async function getPipelineRun(runId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getPipelineRun(runId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(pipelineRuns).where(eq(pipelineRuns.id, runId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePipelineRun(runId: number, updates: any) {
  if (shouldUseMockDb()) {
    mockDb.updatePipelineRun(runId, updates);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pipelineRuns).set(updates).where(eq(pipelineRuns.id, runId));
}

export async function createPipelineStage(runId: number, stageNumber: number, stageName: string, inputs?: any) {
  if (shouldUseMockDb()) {
    return mockDb.insertPipelineStage({
      runId,
      stageNumber,
      stageName,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pipelineStages).values({
    runId,
    stageNumber,
    stageName,
    inputs: inputs ? JSON.stringify(inputs) : null,
    status: "pending",
  });

  // Get the inserted ID by fetching the last inserted row
  const stages = await db.select().from(pipelineStages).orderBy(desc(pipelineStages.id)).limit(1);
  if (stages.length > 0) {
    return { insertId: stages[0].id };
  }
  return result;
}

export async function getPipelineStage(stageId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getPipelineStage(stageId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(pipelineStages).where(eq(pipelineStages.id, stageId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePipelineStage(stageId: number, updates: any) {
  if (shouldUseMockDb()) {
    mockDb.updatePipelineStage(stageId, updates);
    return;
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pipelineStages).set(updates).where(eq(pipelineStages.id, stageId));
}

export async function createStageResult(stageId: number, analysis: string, recommendations?: string, signals?: any, riskFactors?: any, metadata?: any) {
  if (shouldUseMockDb()) {
    return mockDb.insertStageResult({
      stageId,
      analysis,
      summary: recommendations || "See analysis",
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: "completed",
      config: signals ? JSON.stringify(signals) : null,
      createdAt: new Date(),
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(stageResults).values({
    stageId,
    analysis,
    recommendations,
    signals: signals ? JSON.stringify(signals) : null,
    riskFactors: riskFactors ? JSON.stringify(riskFactors) : null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    confidence: "high",
  });

  return result;
}

export async function getStageResult(stageId: number) {
  if (shouldUseMockDb()) {
    const results = mockDb.getStageResults(stageId);
    return results.length > 0 ? results[0] : null;
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(stageResults).where(eq(stageResults.stageId, stageId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createTradingDecision(runId: number, decision: string, rationale: string, symbol?: string, targetPrice?: string, stopLoss?: string, riskReward?: string, quantity?: string) {
  if (shouldUseMockDb()) {
    console.log("[Database] Mock: createTradingDecision for run", runId);
    return mockDb.insertTradingDecision({
      runId,
      decision,
      rationale,
      symbol: symbol || "UNKNOWN",
      targetPrice: targetPrice || "0.00",
      stopLoss: stopLoss || "0.00",
      riskReward: riskReward || "N/A",
      quantity: quantity || "0",
      executionStatus: "pending",
      createdAt: new Date(),
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(tradingDecisions).values({
    runId,
    decision,
    rationale,
    symbol,
    targetPrice,
    stopLoss,
    riskReward,
    quantity,
    executionStatus: "pending",
  });

  return result;
}

export async function getTradingDecision(runId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getTradingDecision(runId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(tradingDecisions).where(eq(tradingDecisions.runId, runId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createAuditorReport(runId: number, portfolioName: string | null, portfolioStructure: string, correlationRisk: string, volatilityExposure: string, signalQuality: string, narrativeDrift: string, overallRiskScore: string, recommendations: string, criticalIssues?: any) {
  if (shouldUseMockDb()) {
    console.log("[Database] Mock: createAuditorReport for run", runId, "portfolio:", portfolioName || "(standalone)");
    return mockDb.insertAuditorReport({
      runId,
      portfolioName,
      analysis: JSON.stringify({ portfolioStructure, correlationRisk, volatilityExposure, signalQuality, narrativeDrift, overallRiskScore, criticalIssues }),
      overallRisk: parseFloat(overallRiskScore) || 5,
      recommendations,
      createdAt: new Date(),
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(auditorReports).values({
    runId,
    portfolioStructure,
    correlationRisk,
    volatilityExposure,
    signalQuality,
    narrativeDrift,
    overallRiskScore,
    recommendations,
    criticalIssues: criticalIssues ? JSON.stringify(criticalIssues) : null,
  });

  return result;
}

export async function getAuditorReport(runId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getAuditorReport(runId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(auditorReports).where(eq(auditorReports.runId, runId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllPortfolioProfiles() {
  if (shouldUseMockDb()) {
    return mockDb.getAllPortfolioProfiles();
  }

  // For real database, would implement similar query
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Group by portfolio name, get most recent audit date and count
  // This would require a proper SQL GROUP BY query
  return [];
}

export async function createPipelineSummary(runId: number, overallAnalysis: string, keyFindings?: any, recommendedActions?: any, riskAssessment?: string, performanceMetrics?: any) {
  if (shouldUseMockDb()) {
    console.log("[Database] Mock: createPipelineSummary for run", runId);
    return mockDb.insertPipelineSummary({
      runId,
      overallAnalysis,
      keyFindings: keyFindings ? JSON.stringify(keyFindings) : null,
      recommendedActions: recommendedActions ? JSON.stringify(recommendedActions) : null,
      riskAssessment: riskAssessment || null,
      performanceMetrics: performanceMetrics ? JSON.stringify(performanceMetrics) : null,
      createdAt: new Date(),
    });
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(pipelineSummaries).values({
    runId,
    overallAnalysis,
    keyFindings: keyFindings ? JSON.stringify(keyFindings) : null,
    recommendedActions: recommendedActions ? JSON.stringify(recommendedActions) : null,
    riskAssessment,
    performanceMetrics: performanceMetrics ? JSON.stringify(performanceMetrics) : null,
  });

  return result;
}

export async function getPipelineSummary(runId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getPipelineSummary(runId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(pipelineSummaries).where(eq(pipelineSummaries.runId, runId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getUserPipelineRuns(userId: number, limit: number = 10) {
  if (shouldUseMockDb()) {
    return mockDb.getUserPipelineRuns(userId, limit);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(pipelineRuns).where(eq(pipelineRuns.userId, userId)).limit(limit);
  return result;
}

export async function getAllStagesForRun(runId: number) {
  if (shouldUseMockDb()) {
    return mockDb.getStagesWithResultsForRun(runId);
  }

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all stages for this run with their results
  const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.runId, runId)).orderBy(pipelineStages.stageNumber);
  
  const stagesWithResults = await Promise.all(
    stages.map(async (stage) => {
      const results = await db.select().from(stageResults).where(eq(stageResults.stageId, stage.id)).limit(1);
      const result = results.length > 0 ? results[0] : null;
      
      return {
        stageId: stage.id,
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        status: stage.status,
        analysis: result?.analysis || null,
        summary: result?.recommendations || null,
        metadata: result?.metadata || null,
        createdAt: result?.createdAt || stage.createdAt,
      };
    })
  );

  return stagesWithResults;
}
