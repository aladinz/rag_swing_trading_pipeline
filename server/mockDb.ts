/**
 * Mock in-memory database for development when MySQL is not available
 * Provides table storage and basic query operations
 */

type PipelineRun = {
  id: number;
  userId: number;
  runName: string;
  status: "in_progress" | "completed" | "failed";
  executionMode: "step_by_step" | "full_pipeline";
  currentStage: number;
  totalStages: number;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

type PipelineStage = {
  id: number;
  runId: number;
  stageNumber: number;
  stageName: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
};

type StageResult = {
  id: number;
  stageId: number;
  analysis: string;
  summary: string;
  metadata: string | null;
  status: string | null;
  config: string | null;
  createdAt: Date;
};

type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

type PipelineSummary = {
  id: number;
  runId: number;
  overallAnalysis: string;
  keyFindings: string | null;
  recommendedActions: string | null;
  riskAssessment: string | null;
  performanceMetrics: string | null;
  createdAt: Date;
};

type TradingDecision = {
  id: number;
  runId: number;
  decision: string;
  rationale: string;
  symbol: string;
  targetPrice: string;
  stopLoss: string;
  riskReward: string;
  quantity: string;
  executionStatus: string;
  createdAt: Date;
};

type AuditorReport = {
  id: number;
  runId: number;
  analysis: string;
  overallRisk: number;
  recommendations: string | null;
  createdAt: Date;
};

class MockDatabase {
  private pipelineRuns: PipelineRun[] = [];
  private pipelineStages: PipelineStage[] = [];
  private stageResults: StageResult[] = [];
  private users: User[] = [];
  private pipelineSummaries: PipelineSummary[] = [];
  private tradingDecisions: TradingDecision[] = [];
  private auditorReports: AuditorReport[] = [];
  private runIdCounter = 1;
  private stageIdCounter = 1;
  private resultIdCounter = 1;
  private userIdCounter = 1;
  private summaryIdCounter = 1;
  private decisionIdCounter = 1;
  private reportIdCounter = 1;

  // Insert pipeline run
  insertPipelineRun(data: Omit<PipelineRun, "id">): { insertId: number } {
    const id = this.runIdCounter++;
    this.pipelineRuns.push({ ...data, id });
    return { insertId: id };
  }

  // Get pipeline run
  getPipelineRun(id: number): PipelineRun | null {
    return this.pipelineRuns.find(r => r.id === id) || null;
  }

  // Insert pipeline stage
  insertPipelineStage(data: Omit<PipelineStage, "id">): { insertId: number } {
    const id = this.stageIdCounter++;
    this.pipelineStages.push({ ...data, id });
    return { insertId: id };
  }

  // Get pipeline stage
  getPipelineStage(id: number): PipelineStage | null {
    return this.pipelineStages.find(s => s.id === id) || null;
  }

  // Update pipeline stage
  updatePipelineStage(id: number, data: Partial<PipelineStage>): void {
    const stage = this.pipelineStages.find(s => s.id === id);
    if (stage) {
      Object.assign(stage, { ...data, updatedAt: new Date() });
    }
  }

  // Insert stage result
  insertStageResult(data: Omit<StageResult, "id">): { insertId: number } {
    const id = this.resultIdCounter++;
    this.stageResults.push({ ...data, id });
    return { insertId: id };
  }

  // Get stage results for a stage
  getStageResults(stageId: number): StageResult[] {
    return this.stageResults.filter(r => r.stageId === stageId);
  }

  // Update pipeline run
  updatePipelineRun(id: number, data: Partial<PipelineRun>): void {
    const run = this.pipelineRuns.find(r => r.id === id);
    if (run) {
      Object.assign(run, { ...data, updatedAt: new Date() });
    }
  }

  // Insert or update user
  insertUser(data: Omit<User, "id">): { insertId: number } {
    const existing = this.users.find(u => u.openId === data.openId);
    if (existing) {
      Object.assign(existing, data);
      return { insertId: existing.id };
    }
    const id = this.userIdCounter++;
    this.users.push({ ...data, id });
    return { insertId: id };
  }

  // Get user by ID
  getUser(id: number): User | null {
    return this.users.find(u => u.id === id) || null;
  }

  // Get user by openId
  getUserByOpenId(openId: string): User | null {
    return this.users.find(u => u.openId === openId) || null;
  }

  // Insert pipeline summary
  insertPipelineSummary(data: Omit<PipelineSummary, "id">): { insertId: number } {
    const id = this.summaryIdCounter++;
    this.pipelineSummaries.push({ ...data, id });
    return { insertId: id };
  }

  // Get pipeline summary by runId
  getPipelineSummary(runId: number): PipelineSummary | null {
    return this.pipelineSummaries.find(s => s.runId === runId) || null;
  }

  // Insert trading decision
  insertTradingDecision(data: Omit<TradingDecision, "id">): { insertId: number } {
    const id = this.decisionIdCounter++;
    this.tradingDecisions.push({ ...data, id });
    return { insertId: id };
  }

  // Get trading decision by runId
  getTradingDecision(runId: number): TradingDecision | null {
    return this.tradingDecisions.find(d => d.runId === runId) || null;
  }

  // Insert auditor report
  insertAuditorReport(data: Omit<AuditorReport, "id">): { insertId: number } {
    const id = this.reportIdCounter++;
    this.auditorReports.push({ ...data, id });
    return { insertId: id };
  }

  // Get auditor report by runId
  getAuditorReport(runId: number): AuditorReport | null {
    return this.auditorReports.find(r => r.runId === runId) || null;
  }

  // Get all stages for a run with their results
  getStagesWithResultsForRun(runId: number): Array<{
    stageId: number;
    stageNumber: number;
    stageName: string;
    status: string;
    analysis: string | null;
    summary: string | null;
    metadata: string | null;
    createdAt: Date;
  }> {
    const stages = this.pipelineStages
      .filter(s => s.runId === runId)
      .sort((a, b) => a.stageNumber - b.stageNumber);
    
    return stages.map(stage => {
      const results = this.stageResults.filter(r => r.stageId === stage.id);
      const result = results.length > 0 ? results[0] : null;
      
      return {
        stageId: stage.id,
        stageNumber: stage.stageNumber,
        stageName: stage.stageName,
        status: stage.status,
        analysis: result?.analysis || null,
        summary: result?.summary || null,
        metadata: result?.metadata || null,
        createdAt: result?.createdAt || stage.createdAt,
      };
    });
  }

  // Get user pipeline runs
  getUserPipelineRuns(userId: number, limit: number = 10): PipelineRun[] {
    return this.pipelineRuns
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  // Clear all data (for testing)
  clear(): void {
    this.pipelineRuns = [];
    this.pipelineStages = [];
    this.stageResults = [];
    this.users = [];
    this.pipelineSummaries = [];
    this.tradingDecisions = [];
    this.auditorReports = [];
    this.runIdCounter = 1;
    this.stageIdCounter = 1;
    this.resultIdCounter = 1;
    this.userIdCounter = 1;
    this.summaryIdCounter = 1;
    this.decisionIdCounter = 1;
    this.reportIdCounter = 1;
  }
}

// Export singleton instance
export const mockDb = new MockDatabase();
