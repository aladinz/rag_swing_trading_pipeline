import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Play, RotateCcw, Loader2, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";

const PIPELINE_STAGES = [
  { id: 0, name: "Reset", description: "Clear all biases and assumptions. Analyze market with fresh perspective." },
  { id: 1, name: "Coarse Retrieval", description: "Retrieve relevant trading signals and market data." },
  { id: 2, name: "Re-Ranking", description: "Rank retrieved signals by relevance and quality." },
  { id: 3, name: "Narrative Compression", description: "Compress trading narrative into key insights." },
  { id: 4, name: "Risk Framing", description: "Frame all risks in the trading decision." },
  { id: 5, name: "Execution Guidance", description: "Provide specific execution guidance for the trade." },
  { id: 6, name: "Portfolio Scoring", description: "Score portfolio and individual positions." },
  { id: 7, name: "Decision Ritual", description: "Apply decision-making rituals to finalize decision." },
  { id: 8, name: "Debrief Loop", description: "Debrief decision and extract lessons learned." },
];

export default function PipelineDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [currentStage, setCurrentStage] = useState(0);
  const [runName, setRunName] = useState("Pipeline Run " + new Date().toLocaleDateString());
  const [executionMode, setExecutionMode] = useState<"step_by_step" | "full_pipeline">("step_by_step");
  const [stageInputs, setStageInputs] = useState<Record<number, string>>({});
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [unifiedInput, setUnifiedInput] = useState("");
  const [advancedMode, setAdvancedMode] = useState(false);

  const createRunMutation = trpc.pipeline.createRun.useMutation();
  const executeStageMutation = trpc.pipeline.executeStage.useMutation();
  const executeFullMutation = trpc.pipeline.executeFull.useMutation();

  const handleAutoFill = () => {
    if (!unifiedInput.trim()) {
      toast.error("Please enter unified input first");
      return;
    }

    const input = unifiedInput.trim();
    const autoFilledInputs: Record<number, string> = {
      0: `Reset all biases and assumptions. Starting fresh analysis with the following context:\n\n${input.substring(0, 200)}...`,
      1: `Retrieve broad market signals and relevant data:\n\nPortfolio Context: ${input.substring(0, 150)}...\n\nMarket Signals: Analyzing macro trends, sector performance, and key indicators based on provided data.`,
      2: `Prioritize signals by importance:\n\n1. Primary signals from portfolio data\n2. Secondary market indicators\n3. Supporting trend analysis\n\nBased on: ${input.substring(0, 100)}...`,
      3: `Market Story Summary:\n\nThe portfolio shows ${input.includes("IRA") || input.includes("portfolio") ? "structured positioning" : "market exposure"} with key focus on ${input.includes("bond") || input.includes("SGOV") || input.includes("treasury") ? "fixed income stability" : "growth allocation"}. Current environment suggests ${input.includes("risk") ? "risk-aware positioning" : "balanced approach"} with attention to diversification.`,
      4: `Risk Assessment:\n\nCurrent portfolio structure based on the provided data shows ${input.includes("50") || input.includes("high") ? "significant" : "moderate"} concentration. Key risks include market volatility, interest rate sensitivity, and sector concentration. Overall risk posture appears ${input.includes("conservative") || input.includes("safe") ? "conservative" : "moderate"} given current allocations.`,
      5: `Execution Guidance:\n\nBased on current portfolio state:\n- Monitor positions for drift beyond target allocations\n- Consider rebalancing if any position exceeds threshold\n- Maintain tax efficiency in adjustments\n- Execute changes during optimal market conditions\n\nSpecific actions will depend on actual vs target allocations from the data provided.`,
      6: `Portfolio Scoring:\n\n• Volatility Score: Medium (based on asset mix)\n• Correlation Score: Moderate diversification\n• Collapse Risk: Low to moderate\n• Drift Analysis: Monitoring required\n• Diversification: Adequate across asset classes\n\nOverall Portfolio Health: Good, with minor monitoring points.`,
      7: `Decision Recommendation:\n\nBased on analysis: ${input.includes("rebalance") ? "REBALANCE" : input.includes("hold") ? "HOLD" : "MONITOR"}\n\nRationale: Current portfolio positioning ${input.includes("drift") ? "shows drift requiring adjustment" : "appears stable"}. ${input.includes("risk") ? "Risk levels warrant attention" : "Risk profile is acceptable"}. Recommended action aligns with long-term strategy while managing short-term concerns.`,
      8: `Key Takeaways:\n\n1. Portfolio structure reviewed and analyzed\n2. Risk assessment completed within acceptable parameters\n3. Current positioning ${input.includes("good") || input.includes("stable") ? "is appropriate" : "requires monitoring"}\n4. Next review: 30 days or upon significant market change\n\nAction Items: ${input.includes("rebalance") ? "Execute rebalancing plan" : "Continue monitoring current allocations"}.`
    };

    setStageInputs(autoFilledInputs);
    toast.success("All stages auto-filled from unified input");
  };

  const handleCreateRun = async () => {
    try {
      const result = await createRunMutation.mutateAsync({
        runName,
        executionMode,
        metadata: { createdBy: user?.id },
      });
      setCurrentRunId(result.runId);
      toast.success("Pipeline run created");
    } catch (error) {
      toast.error("Failed to create pipeline run");
    }
  };

  const handleExecuteStage = async () => {
    if (!currentRunId) {
      toast.error("Please create a pipeline run first");
      return;
    }

    setIsExecuting(true);
    try {
      const inputs = stageInputs[currentStage] || "No specific input provided";
      await executeStageMutation.mutateAsync({
        runId: currentRunId,
        stageNumber: currentStage,
        inputs: { userInput: inputs, stage: PIPELINE_STAGES[currentStage].name },
      });

      setCompletedStages(new Set(Array.from(completedStages).concat(currentStage)));
      toast.success(`Stage ${currentStage + 1} completed`);

      if (currentStage < 8) {
        setCurrentStage(currentStage + 1);
      }
    } catch (error) {
      toast.error("Failed to execute stage");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteFull = async () => {
    if (!currentRunId) {
      toast.error("Please create a pipeline run first");
      return;
    }

    setIsExecuting(true);
    try {
      const result = await executeFullMutation.mutateAsync({
        runId: currentRunId,
        inputs: { userInputs: stageInputs, allStages: true },
      });

      setCompletedStages(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
      toast.success("Full pipeline completed");

      // Navigate to summary after a short delay
      setTimeout(() => {
        navigate(`/summary/${currentRunId}`);
      }, 1000);
    } catch (error) {
      toast.error("Failed to execute full pipeline");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReset = () => {
    setCurrentStage(0);
    setCompletedStages(new Set());
    setStageInputs({});
    setCurrentRunId(null);
    setRunName("Pipeline Run " + new Date().toLocaleDateString());
    toast.info("Pipeline reset");
  };

  const progressPercent = (completedStages.size / 9) * 100;

  return (
    <PageLayout
      title="Trading Pipeline"
      subtitle="Multi-stage AI-powered analysis workflow"
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg">Pipeline Stages</CardTitle>
                <CardDescription>Progress: {completedStages.size}/9</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Progress value={progressPercent} className="mb-4" />
                {PIPELINE_STAGES.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => setCurrentStage(stage.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentStage === stage.id
                        ? "bg-blue-600 dark:bg-blue-700 text-white"
                        : completedStages.has(stage.id)
                        ? "bg-green-50 dark:bg-green-950 text-green-900 dark:text-green-100 hover:bg-green-100 dark:hover:bg-green-900"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {completedStages.has(stage.id) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4" />
                      )}
                      <span className="text-sm font-medium">{stage.id + 1}. {stage.name}</span>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Run Setup Card */}
            {!currentRunId && (
              <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle>Create Pipeline Run</CardTitle>
                  <CardDescription>Set up your trading analysis session</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Run Name</label>
                    <Input
                      value={runName}
                      onChange={(e) => setRunName(e.target.value)}
                      placeholder="e.g., AAPL Analysis - Jan 2024"
                      className="mt-1"
                    />
                  </div>

                  {/* Unified Input Section */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-foreground">Unified Input</label>
                      <label className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={advancedMode}
                          onChange={(e) => setAdvancedMode(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span className="text-slate-600 dark:text-slate-400">Advanced Mode</span>
                      </label>
                    </div>
                    <Textarea
                      value={unifiedInput}
                      onChange={(e) => setUnifiedInput(e.target.value)}
                      placeholder="Enter portfolio data, market signals, goals, or any notes. This single input will auto-fill all 9 pipeline stages.

Example:
- Portfolio: Traditional IRA with SGOV 50%, SCHD 10%, VTI 30%, VXUS 10%
- Goal: Conservative growth with income
- Market context: Rising rates, tech volatility
- Concerns: Portfolio drift, rebalancing needs"
                      className="mt-2 min-h-40 font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {advancedMode 
                        ? "Advanced mode: You can manually edit each stage after creating the run."
                        : "All 9 stages will auto-fill from this input. Enable Advanced Mode to edit stages manually."}
                    </p>
                    {!advancedMode && unifiedInput.trim() && (
                      <Button
                        onClick={handleAutoFill}
                        variant="outline"
                        className="w-full mt-3"
                      >
                        Auto-Fill All Stages
                      </Button>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700">Execution Mode</label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={executionMode === "step_by_step"}
                          onChange={() => setExecutionMode("step_by_step")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Step by Step</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={executionMode === "full_pipeline"}
                          onChange={() => setExecutionMode("full_pipeline")}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Full Pipeline</span>
                      </label>
                    </div>
                  </div>
                  <Button onClick={handleCreateRun} className="w-full bg-blue-600 hover:bg-blue-700">
                    Create Run
                  </Button>
                  {!advancedMode && Object.keys(stageInputs).length === 9 && (
                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-900 dark:text-green-100">All Stages Auto-Filled</p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          All 9 pipeline stages have been populated from your unified input. Create the run to begin execution.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Stage Content */}
            {currentRunId && (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl">
                          Stage {currentStage + 1}: {PIPELINE_STAGES[currentStage].name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {PIPELINE_STAGES[currentStage].description}
                        </CardDescription>
                      </div>
                      {completedStages.has(currentStage) && (
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-slate-700">Analysis Input</label>
                      <Textarea
                        value={stageInputs[currentStage] || ""}
                        onChange={(e) => setStageInputs({ ...stageInputs, [currentStage]: e.target.value })}
                        placeholder={`Provide input for ${PIPELINE_STAGES[currentStage].name}...`}
                        className="mt-2 min-h-32"
                        disabled={!advancedMode && !stageInputs[currentStage]}
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        {advancedMode || stageInputs[currentStage]
                          ? "Provide relevant market data, signals, or analysis for this stage."
                          : "This stage will auto-fill from unified input. Enable Advanced Mode to edit manually."}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={handleExecuteStage}
                        disabled={isExecuting}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Execute Stage
                          </>
                        )}
                      </Button>
                      {executionMode === "full_pipeline" && (
                        <Button
                          onClick={handleExecuteFull}
                          disabled={isExecuting}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          {isExecuting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Run Full Pipeline
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Results Preview */}
                {completedStages.has(currentStage) && (
                  <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800">
                    <CardHeader>
                      <CardTitle className="text-green-900 dark:text-green-100">Stage Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Analysis completed for {PIPELINE_STAGES[currentStage].name}. Results are being processed and will be available in the summary report.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* View Summary Button - shown when all stages complete */}
                {completedStages.size === 9 && currentRunId && (
                  <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                    <CardHeader>
                      <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5" />
                        All Stages Complete!
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                        All 9 pipeline stages have been executed successfully. Your comprehensive analysis report is ready.
                      </p>
                      <Button
                        onClick={() => navigate(`/summary/${currentRunId}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        View Summary Report
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Navigation */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => setCurrentStage(Math.max(0, currentStage - 1))}
                    disabled={currentStage === 0}
                    variant="outline"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentStage(Math.min(8, currentStage + 1))}
                    disabled={currentStage === 8}
                    variant="outline"
                  >
                    Next
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="destructive"
                    className="ml-auto"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
    </PageLayout>
  );
}
