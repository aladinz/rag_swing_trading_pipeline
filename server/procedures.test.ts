import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Unit tests for tRPC procedure structure and input validation.
 * These tests verify that procedures are properly defined and accept correct input types.
 */

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

describe("Procedure Structure Tests", () => {
  it("should have all required pipeline procedures", () => {
    const procedures = Object.keys(appRouter._def.procedures);
    expect(procedures).toContain("pipeline");
    expect(procedures).toContain("auditor");
    expect(procedures).toContain("auth");
    expect(procedures).toContain("system");
  });

  it("should have all required pipeline sub-procedures", () => {
    const router = appRouter._def.procedures.pipeline as any;
    const procedures = Object.keys(router._def.procedures);

    expect(procedures).toContain("createRun");
    expect(procedures).toContain("getRun");
    expect(procedures).toContain("getUserRuns");
    expect(procedures).toContain("executeStage");
    expect(procedures).toContain("executeFull");
    expect(procedures).toContain("getStageResults");
    expect(procedures).toContain("getTradingDecision");
    expect(procedures).toContain("getSummary");
  });

  it("should have all required auditor sub-procedures", () => {
    const router = appRouter._def.procedures.auditor as any;
    const procedures = Object.keys(router._def.procedures);

    expect(procedures).toContain("runAudit");
    expect(procedures).toContain("getReport");
  });

  it("should have all required auth sub-procedures", () => {
    const router = appRouter._def.procedures.auth as any;
    const procedures = Object.keys(router._def.procedures);

    expect(procedures).toContain("me");
    expect(procedures).toContain("logout");
  });
});

describe("Input Validation Tests", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  describe("pipeline.createRun validation", () => {
    it("should reject missing runName", async () => {
      await expect(
        caller.pipeline.createRun({
          runName: "", // Empty string
          executionMode: "step_by_step",
        })
      ).rejects.toThrow();
    });

    it("should reject invalid executionMode", async () => {
      await expect(
        caller.pipeline.createRun({
          runName: "Test",
          executionMode: "invalid_mode" as any,
        })
      ).rejects.toThrow();
    });

    it("should accept valid inputs", async () => {
      const result = await caller.pipeline.createRun({
        runName: "Valid Run",
        executionMode: "step_by_step",
      });
      expect(result).toHaveProperty("runId");
    });
  });

  describe("pipeline.executeStage validation", () => {
    it("should reject invalid stage number (negative)", async () => {
      await expect(
        caller.pipeline.executeStage({
          runId: 1,
          stageNumber: -1,
          inputs: {},
        })
      ).rejects.toThrow();
    });

    it("should reject invalid stage number (too high)", async () => {
      await expect(
        caller.pipeline.executeStage({
          runId: 1,
          stageNumber: 9,
          inputs: {},
        })
      ).rejects.toThrow();
    });

    it("should accept valid stage numbers 0-8", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Stage Test",
        executionMode: "step_by_step",
      });

      for (let i = 0; i < 9; i++) {
        const result = await caller.pipeline.executeStage({
          runId: createResult.runId,
          stageNumber: i,
          inputs: { test: "data" },
        });
        expect(result).toHaveProperty("stageId");
      }
    });
  });

  describe("auditor.runAudit validation", () => {
    it("should accept portfolio data", async () => {
      const createResult = await caller.pipeline.createRun({
        runName: "Auditor Test",
        executionMode: "step_by_step",
      });

      const result = await caller.auditor.runAudit({
        runId: createResult.runId,
        portfolioData: { holdings: [] },
      });

      expect(result).toHaveProperty("runId");
      expect(result).toHaveProperty("analysis");
    });
  });
});

describe("Response Structure Tests", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  it("createRun should return object with runId", async () => {
    const result = await caller.pipeline.createRun({
      runName: "Response Test",
      executionMode: "step_by_step",
    });

    expect(typeof result).toBe("object");
    expect(result).toHaveProperty("runId");
    expect(typeof result.runId).toBe("number");
  });

  it("executeStage should return analysis object", async () => {
    const createResult = await caller.pipeline.createRun({
      runName: "Analysis Test",
      executionMode: "step_by_step",
    });

    const result = await caller.pipeline.executeStage({
      runId: createResult.runId,
      stageNumber: 0,
      inputs: { test: "data" },
    });

    expect(result).toHaveProperty("stageId");
    expect(result).toHaveProperty("analysis");
    expect(result).toHaveProperty("status");
    expect(typeof result.analysis).toBe("string");
    expect(result.status).toBe("completed");
  });

  it("auth.me should return current user", async () => {
    const user = await caller.auth.me();

    expect(user).toBeTruthy();
    expect(user?.id).toBe(1);
    expect(user?.openId).toBe("test-user");
    expect(user?.email).toBe("test@example.com");
    expect(user?.name).toBe("Test User");
  });

  it("auth.logout should return success", async () => {
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
  });
});

describe("Error Handling Tests", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  it("should handle missing required parameters gracefully", async () => {
    await expect(
      caller.pipeline.createRun({
        runName: "Test",
        executionMode: undefined as any,
      })
    ).rejects.toThrow();
  });

  it("should handle invalid run IDs", async () => {
    const result = await caller.pipeline.getRun({ runId: 999999 });
    expect(result).toBeNull();
  });

  it("should handle invalid stage IDs", async () => {
    const result = await caller.pipeline.getStageResults({ stageId: 999999 });
    expect(result).toBeNull();
  });
});

describe("Pipeline Workflow Tests", () => {
  const ctx = createMockContext();
  const caller = appRouter.createCaller(ctx);

  it("should support complete step-by-step workflow", async () => {
    // Create run
    const createResult = await caller.pipeline.createRun({
      runName: "Workflow Test",
      executionMode: "step_by_step",
    });
    expect(createResult.runId).toBeGreaterThan(0);

    // Get run
    const run = await caller.pipeline.getRun({ runId: createResult.runId });
    expect(run?.status).toBe("in_progress");

    // Execute stage
    const stageResult = await caller.pipeline.executeStage({
      runId: createResult.runId,
      stageNumber: 0,
      inputs: { test: "data" },
    });
    expect(stageResult.status).toBe("completed");

    // Get stage results
    const results = await caller.pipeline.getStageResults({
      stageId: stageResult.stageId,
    });
    expect(results).toBeTruthy();
  });

  it("should support full pipeline execution", async () => {
    const createResult = await caller.pipeline.createRun({
      runName: "Full Pipeline Test",
      executionMode: "full_pipeline",
    });

    const result = await caller.pipeline.executeFull({
      runId: createResult.runId,
      inputs: { test: "data" },
    });

    expect(result.status).toBe("completed");
    expect(result.stagesExecuted).toBe(9);
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBe(9);
  });

  it("should support auditor workflow", async () => {
    const createResult = await caller.pipeline.createRun({
      runName: "Auditor Workflow Test",
      executionMode: "step_by_step",
    });

    const auditResult = await caller.auditor.runAudit({
      runId: createResult.runId,
      portfolioData: { test: "portfolio" },
    });

    expect(auditResult.status).toBe("completed");
    expect(auditResult.analysis).toBeTruthy();
    expect(auditResult.sections).toBeTruthy();
  });
});
