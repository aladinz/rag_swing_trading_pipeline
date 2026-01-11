import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock user context
function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Pipeline Procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("pipeline.createRun", () => {
    it("should create a new pipeline run with correct initial state", async () => {
      const result = await caller.pipeline.createRun({
        runName: "Test Pipeline Run",
        executionMode: "step_by_step",
        metadata: { testData: true },
      });

      expect(result).toHaveProperty("runId");
      expect(typeof result.runId).toBe("number");
      expect(result.runId).toBeGreaterThan(0);
    });

    it("should accept full_pipeline execution mode", async () => {
      const result = await caller.pipeline.createRun({
        runName: "Full Pipeline Test",
        executionMode: "full_pipeline",
      });

      expect(result).toHaveProperty("runId");
      expect(result.runId).toBeGreaterThan(0);
    });

    it("should handle optional metadata", async () => {
      const result = await caller.pipeline.createRun({
        runName: "Test without metadata",
        executionMode: "step_by_step",
      });

      expect(result).toHaveProperty("runId");
    });
  });

  describe("pipeline.getRun", () => {
    it("should retrieve a created pipeline run", async () => {
      // Create a run first
      const createResult = await caller.pipeline.createRun({
        runName: "Test Get Run",
        executionMode: "step_by_step",
      });

      // Retrieve it
      const run = await caller.pipeline.getRun({ runId: createResult.runId });

      expect(run).toBeTruthy();
      expect(run?.runName).toBe("Test Get Run");
      expect(run?.status).toBe("in_progress");
      expect(run?.currentStage).toBe(0);
      expect(run?.totalStages).toBe(9);
    });

    it("should return null for non-existent run", async () => {
      const run = await caller.pipeline.getRun({ runId: 99999 });
      expect(run).toBeNull();
    });
  });

  describe("pipeline.getUserRuns", () => {
    it("should retrieve user's pipeline runs", async () => {
      // Create a few runs
      await caller.pipeline.createRun({
        runName: "Run 1",
        executionMode: "step_by_step",
      });
      await caller.pipeline.createRun({
        runName: "Run 2",
        executionMode: "full_pipeline",
      });

      // Get user runs
      const runs = await caller.pipeline.getUserRuns();

      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("pipeline.executeStage", () => {
    it("should execute a single pipeline stage", async () => {
      // Create a run
      const createResult = await caller.pipeline.createRun({
        runName: "Stage Execution Test",
        executionMode: "step_by_step",
      });

      // Execute stage 0 (Reset)
      const stageResult = await caller.pipeline.executeStage({
        runId: createResult.runId,
        stageNumber: 0,
        inputs: { marketData: "test data", symbol: "AAPL" },
      });

      expect(stageResult).toHaveProperty("stageId");
      expect(stageResult).toHaveProperty("analysis");
      expect(stageResult.status).toBe("completed");
      expect(typeof stageResult.analysis).toBe("string");
      expect(stageResult.analysis.length).toBeGreaterThan(0);
    });

    it("should execute all 9 stages sequentially", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "All Stages Test",
        executionMode: "step_by_step",
      });

      const stageResults = [];

      for (let i = 0; i < 9; i++) {
        const result = await caller.pipeline.executeStage({
          runId: createResult.runId,
          stageNumber: i,
          inputs: { stageInput: `Stage ${i} input` },
        });

        stageResults.push(result);
        expect(result.status).toBe("completed");
        expect(result.analysis).toBeTruthy();
      }

      expect(stageResults.length).toBe(9);
    });

    it("should validate stage number range", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Invalid Stage Test",
        executionMode: "step_by_step",
      });

      // Stage 9 should fail (valid range is 0-8)
      await expect(
        caller.pipeline.executeStage({
          runId: createResult.runId,
          stageNumber: 9,
          inputs: {},
        })
      ).rejects.toThrow();
    });
  });

  describe("pipeline.executeFull", () => {
    it("should execute full pipeline with all 9 stages", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Full Pipeline Execution",
        executionMode: "full_pipeline",
      });

      const result = await caller.pipeline.executeFull({
        runId: createResult.runId,
        inputs: { marketData: "comprehensive test data" },
      });

      expect(result).toHaveProperty("runId");
      expect(result.status).toBe("completed");
      expect(result.stagesExecuted).toBe(9);
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.results.length).toBe(9);
      expect(result.summary).toBeTruthy();
    });

    it("should create trading decision after full pipeline", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Decision Test",
        executionMode: "full_pipeline",
      });

      await caller.pipeline.executeFull({
        runId: createResult.runId,
        inputs: { marketData: "test" },
      });

      const decision = await caller.pipeline.getTradingDecision({
        runId: createResult.runId,
      });

      expect(decision).toBeTruthy();
      expect(decision?.decision).toBeTruthy();
      expect(decision?.rationale).toBeTruthy();
    });

    it("should create pipeline summary after full execution", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Summary Test",
        executionMode: "full_pipeline",
      });

      await caller.pipeline.executeFull({
        runId: createResult.runId,
        inputs: { marketData: "test" },
      });

      const summary = await caller.pipeline.getSummary({
        runId: createResult.runId,
      });

      expect(summary).toBeTruthy();
      expect(summary?.overallAnalysis).toBeTruthy();
      expect(summary?.riskAssessment).toBeTruthy();
    });
  });

  describe("pipeline.getStageResults", () => {
    it("should retrieve results from executed stage", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Stage Results Test",
        executionMode: "step_by_step",
      });

      const stageResult = await caller.pipeline.executeStage({
        runId: createResult.runId,
        stageNumber: 0,
        inputs: { test: "data" },
      });

      const results = await caller.pipeline.getStageResults({
        stageId: stageResult.stageId,
      });

      expect(results).toBeTruthy();
      expect(results?.analysis).toBeTruthy();
    });
  });

  describe("pipeline.getTradingDecision", () => {
    it("should retrieve trading decision after full pipeline", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Decision Retrieval Test",
        executionMode: "full_pipeline",
      });

      await caller.pipeline.executeFull({
        runId: createResult.runId,
        inputs: { marketData: "test" },
      });

      const decision = await caller.pipeline.getTradingDecision({
        runId: createResult.runId,
      });

      expect(decision).toBeTruthy();
      expect(decision?.decision).toBe("BUY");
      expect(decision?.executionStatus).toBe("pending");
    });
  });

  describe("pipeline.getSummary", () => {
    it("should retrieve pipeline summary", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Summary Retrieval Test",
        executionMode: "full_pipeline",
      });

      await caller.pipeline.executeFull({
        runId: createResult.runId,
        inputs: { marketData: "test" },
      });

      const summary = await caller.pipeline.getSummary({
        runId: createResult.runId,
      });

      expect(summary).toBeTruthy();
      expect(summary?.overallAnalysis).toBeTruthy();
      expect(summary?.performanceMetrics).toBeTruthy();
    });
  });
});

describe("Auditor Procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("auditor.runAudit", () => {
    it("should run collapse auditor analysis", async () => {
      // Create a pipeline run first
      const createResult = await caller.pipeline.createRun({
        runName: "Auditor Test",
        executionMode: "step_by_step",
      });

      const portfolioData = {
        holdings: [
          { symbol: "AAPL", weight: 0.3, sector: "Tech" },
          { symbol: "MSFT", weight: 0.2, sector: "Tech" },
          { symbol: "JPM", weight: 0.25, sector: "Finance" },
          { symbol: "XOM", weight: 0.15, sector: "Energy" },
          { symbol: "GLD", weight: 0.1, sector: "Commodities" },
        ],
      };

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData,
      });

      expect(result).toHaveProperty("runId");
      expect(result).toHaveProperty("analysis");
      expect(result).toHaveProperty("sections");
      expect(result.status).toBe("completed");
      expect(result.analysis).toBeTruthy();
    });

    it("should analyze portfolio structure", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Portfolio Structure Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { composition: "test" },
      });

      expect(result.sections).toHaveProperty("portfolioStructure");
      expect(result.sections.portfolioStructure).toBeTruthy();
    });

    it("should analyze correlation risk", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Correlation Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { correlations: "test" },
      });

      expect(result.sections).toHaveProperty("correlationRisk");
      expect(result.sections.correlationRisk).toBeTruthy();
    });

    it("should analyze volatility exposure", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Volatility Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { volatility: "test" },
      });

      expect(result.sections).toHaveProperty("volatilityExposure");
      expect(result.sections.volatilityExposure).toBeTruthy();
    });

    it("should analyze signal quality", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Signal Quality Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { signals: "test" },
      });

      expect(result.sections).toHaveProperty("signalQuality");
      expect(result.sections.signalQuality).toBeTruthy();
    });

    it("should analyze narrative drift", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Narrative Drift Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { narrative: "test" },
      });

      expect(result.sections).toHaveProperty("narrativeDrift");
      expect(result.sections.narrativeDrift).toBeTruthy();
    });
  });

  describe("auditor.getReport", () => {
    it("should retrieve auditor report", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Report Retrieval Test",
        executionMode: "step_by_step",
      });

      await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { test: "data" },
      });

      const report = await caller.auditor.getReport({
        runId: createResult.runId,
      });

      expect(report).toBeTruthy();
      expect(report?.portfolioStructure).toBeTruthy();
      expect(report?.overallRiskScore).toBeTruthy();
    });
  });
});

describe("Auth Procedures", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    const ctx = createMockContext();
    caller = appRouter.createCaller(ctx);
  });

  describe("auth.me", () => {
    it("should return current user", async () => {
      const user = await caller.auth.me();

      expect(user).toBeTruthy();
      expect(user?.id).toBe(1);
      expect(user?.openId).toBe("test-user");
      expect(user?.email).toBe("test@example.com");
    });
  });

  describe("auth.logout", () => {
    it("should clear session and return success", async () => {
      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
    });
  });
});
