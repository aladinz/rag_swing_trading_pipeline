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
  const [executionMode, setExecutionMode] = useState<"step_by_step" | "full_pipeline" | "quick_analyze">("quick_analyze");
  const [stageInputs, setStageInputs] = useState<Record<number, string>>({});
  const [completedStages, setCompletedStages] = useState<Set<number>>(new Set());
  const [currentRunId, setCurrentRunId] = useState<number | null>(null);
  const [executingStage, setExecutingStage] = useState<number | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [quickTicker, setQuickTicker] = useState("");
  const [quickContext, setQuickContext] = useState("");

  const createRunMutation = trpc.pipeline.createRun.useMutation();
  const executeStageMutation = trpc.pipeline.executeStage.useMutation();
  const executeFullMutation = trpc.pipeline.executeFull.useMutation();
  const { data: historicalRuns } = trpc.pipeline.getUserRuns.useQuery(undefined, {
    enabled: showHistory,
  });

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

    if (!stageInputs[currentStage]?.trim()) {
      toast.error(`Please provide input for ${PIPELINE_STAGES[currentStage].name}`);
      return;
    }

    setExecutingStage(currentStage);
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
      } else {
        // All stages complete, navigate to summary
        setTimeout(() => {
          navigate(`/summary/${currentRunId}`);
        }, 1500);
      }
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to execute stage";
      toast.error(errorMsg);
      console.error("Stage execution error:", error);
    } finally {
      setExecutingStage(null);
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

  const handleQuickAnalyze = async () => {
    const ticker = quickTicker.trim().toUpperCase();
    if (!ticker) {
      toast.error("Please enter a ticker symbol");
      return;
    }

    // Validate ticker format (1-5 uppercase letters)
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      toast.error("Invalid ticker format. Use 1-5 letters (e.g., NVDA, AAPL)");
      return;
    }

    try {
      // Create the run
      const result = await createRunMutation.mutateAsync({
        runName: `${ticker} - Quick Analysis`,
        executionMode: "full_pipeline",
        metadata: { ticker, quickAnalyze: true, context: quickContext },
      });
      setCurrentRunId(result.runId);
      
      // Auto-generate stage inputs based on ticker
      const context = quickContext ? ` (Context: ${quickContext})` : "";
      const autoInputs: Record<number, string> = {
        0: `Ticker: ${ticker}${context}\n\nReset all previous assumptions and biases. Analyze ${ticker} with a fresh perspective based on current market conditions.`,
        1: `Ticker: ${ticker}${context}\n\nRetrieve recent price action, volume patterns, sector behavior, earnings data, and macro context relevant to ${ticker}.`,
        2: `Ticker: ${ticker}${context}\n\nRank the most impactful signals for ${ticker}: earnings surprises, volume spikes, technical patterns, sector rotation, and market sentiment.`,
        3: `Ticker: ${ticker}${context}\n\nCompress the current story of ${ticker} into 3-5 clear lines covering: trend, momentum, key levels, and immediate catalysts.`,
        4: `Ticker: ${ticker}${context}\n\nFrame the risk profile of trading ${ticker}: volatility characteristics, correlation to broader markets, sector-specific risks, and collapse exposure.`,
        5: `Ticker: ${ticker}${context}\n\nProvide execution guidance for ${ticker}: optimal entry zones, profit targets, stop loss levels, position sizing, and trade timeframe.`,
        6: `Ticker: ${ticker}${context}\n\nScore ${ticker} across key dimensions: volatility (0-10), momentum (0-10), correlation (0-10), and overall risk (0-10).`,
        7: `Ticker: ${ticker}${context}\n\nMake a clear trading decision for ${ticker}: Trade (BUY/SELL), Wait for better setup, or Avoid. Provide specific reasoning.`,
      };
      
      setStageInputs(autoInputs);
      toast.success(`Auto-generated analysis for ${ticker}`);
      
      // Execute full pipeline
      setIsExecuting(true);
      await executeFullMutation.mutateAsync({
        runId: result.runId,
        inputs: { ticker, quickAnalyze: true, context: quickContext, stageInputs: autoInputs },
      });

      setCompletedStages(new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]));
      toast.success(`${ticker} analysis complete!`);
      
      // Navigate to summary
      setTimeout(() => {
        navigate(`/summary/${result.runId}`);
      }, 1500);
    } catch (error: any) {
      const errorMsg = error?.message || "Analysis failed";
      toast.error(errorMsg);
      console.error("Quick analyze error:", error);
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
    setQuickTicker("");
    setQuickContext("");
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

                  <div>
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Execution Mode</label>
                    <div className="flex flex-col gap-3 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={executionMode === "quick_analyze"}
                          onChange={() => setExecutionMode("quick_analyze")}
                          className="w-4 h-4"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Quick Analyze (Recommended)</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Just enter a ticker - we'll auto-generate all 8 stages</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={executionMode === "step_by_step"}
                          onChange={() => setExecutionMode("step_by_step")}
                          className="w-4 h-4"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Step by Step</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Manual input for each stage</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={executionMode === "full_pipeline"}
                          onChange={() => setExecutionMode("full_pipeline")}
                          className="w-4 h-4"
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">Full Pipeline</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">Run all stages with your inputs</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {executionMode === "quick_analyze" && (
                    <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ticker Symbol *</label>
                        <Input
                          value={quickTicker}
                          onChange={(e) => setQuickTicker(e.target.value.toUpperCase())}
                          placeholder="e.g., NVDA, AAPL, TSLA"
                          className="mt-1 font-mono text-lg"
                          maxLength={5}
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Enter any valid ticker symbol. We'll analyze it automatically.
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Context (Optional)</label>
                        <Input
                          value={quickContext}
                          onChange={(e) => setQuickContext(e.target.value)}
                          placeholder="e.g., 1-week swing, earnings play, breakout setup"
                          className="mt-1"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Add specific context or timeframe if desired.
                        </p>
                      </div>
                      <Button
                        onClick={handleQuickAnalyze}
                        disabled={!quickTicker.trim() || isExecuting}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        size="lg"
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Analyzing {quickTicker}...
                          </>
                        ) : (
                          <>
                            <Play className="w-5 h-5 mr-2" />
                            Analyze {quickTicker || "Ticker"}
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {executionMode !== "quick_analyze" && (
                    <Button onClick={handleCreateRun} className="w-full bg-blue-600 hover:bg-blue-700">
                      Create Run
                    </Button>
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
                      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Analysis Input</label>
                      <Textarea
                        value={stageInputs[currentStage] || ""}
                        onChange={(e) => setStageInputs({ ...stageInputs, [currentStage]: e.target.value })}
                        placeholder={`Provide input for ${PIPELINE_STAGES[currentStage].name}...`}
                        className="mt-2 min-h-32"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Provide relevant market data, signals, or analysis for this stage.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleExecuteStage}
                        disabled={!stageInputs[currentStage] || executingStage === currentStage}
                        className="flex-1"
                      >
                        {executingStage === currentStage ? (
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

            {/* Historical Runs */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Pipeline Runs</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? "Hide History" : "Show History"}
                  </Button>
                </div>
              </CardHeader>
              {showHistory && historicalRuns && historicalRuns.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    {historicalRuns.slice(0, 10).map((run: any) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                        onClick={() => navigate(`/summary/${run.id}`)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{run.runName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(run.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            run.status === "completed" 
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                              : run.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}>
                            {run.status}
                          </span>
                          <span className="text-xs text-slate-500">
                            {run.currentStage}/9 stages
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
              {showHistory && (!historicalRuns || historicalRuns.length === 0) && (
                <CardContent>
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No historical runs found. Create your first pipeline run to see history here.
                  </p>
                </CardContent>
              )}
            </Card>
          </div>
        </div>
    </PageLayout>
  );
}
