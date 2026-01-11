import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Play, RotateCcw, Loader2, Sun, Settings, ChevronDown, Download, AlertCircle, Save, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import { PageLayout } from "@/components/PageLayout";

const RITUAL_TEMPLATE = `# DAILY TRADING RITUAL — ONE-STEP TEMPLATE

Market Environment:
Describe today's market environment + emotional baseline.

Raw Signals:
List index performance, sector rotation, volatility, flow, macro events.

Narrative:
Summarize the market story in 1–3 sentences.

Risks:
List macro, technical, liquidity, correlation, and emotional risks.

Setup:
Ticker + setup type + timeframe + key levels.

Portfolio:
Positions + watchlist + concentration notes.

Decision:
Mental state + constraints + what decision you're making.

Debrief (Optional):
What happened last trade + what you felt + what you learned.`;

const TICKER_REGEX = /^[A-Z]{1,5}$|^[A-Z]{1,5}\.[A-Z]{0,2}$/;
const AUTOSAVE_INTERVAL = 2000;
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export default function DailyRitual() {
  const [, navigate] = useLocation();
  const { theme } = useTheme();
  const [ritualText, setRitualText] = useState("");
  const [ticker, setTicker] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPipelineConfirm, setShowPipelineConfirm] = useState(false);
  const [isSavingToLocalStorage, setIsSavingToLocalStorage] = useState(false);
  const [tickerError, setTickerError] = useState("");

  const createRunMutation = trpc.pipeline.createRun.useMutation();
  const executeFullMutation = trpc.pipeline.executeFull.useMutation();

  const validateTicker = useCallback((value: string): boolean => {
    if (!value.trim()) {
      setTickerError("");
      return false;
    }
    const isValid = TICKER_REGEX.test(value);
    setTickerError(isValid ? "" : "Invalid format. Use 1-5 uppercase letters (e.g., TSLA, BRK.B)");
    return isValid;
  }, []);

  const saveToLocalStorage = useCallback(() => {
    setIsSavingToLocalStorage(true);
    try {
      const sessionData = {
        ritual: ritualText,
        ticker: ticker,
        timestamp: new Date().getTime(),
      };
      localStorage.setItem("dailyRitualSession", JSON.stringify(sessionData));
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    } finally {
      setIsSavingToLocalStorage(false);
    }
  }, [ritualText, ticker]);

  const restoreSessionData = useCallback(() => {
    try {
      const sessionData = localStorage.getItem("dailyRitualSession");
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        const sessionAge = new Date().getTime() - parsed.timestamp;
        if (sessionAge < SESSION_DURATION) {
          setRitualText(parsed.ritual || "");
          setTicker(parsed.ticker || "");
          toast.success("Previous session restored");
          return true;
        } else {
          localStorage.removeItem("dailyRitualSession");
        }
      }
    } catch (error) {
      console.error("Error restoring session:", error);
    }
    return false;
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (!isGenerated || !ritualText && !ticker) return;
    
    const saveTimer = setTimeout(() => {
      saveToLocalStorage();
    }, AUTOSAVE_INTERVAL);

    return () => clearTimeout(saveTimer);
  }, [ritualText, ticker, isGenerated, saveToLocalStorage]);

  // Restore session on mount
  useEffect(() => {
    if (isGenerated) return;
    const restored = restoreSessionData();
    if (restored) {
      setIsGenerated(true);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGenerated) return;

      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleExportRitual();
      } else if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        setShowPipelineConfirm(true);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowClearConfirm(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isGenerated]);

  const handleGenerateRitual = () => {
    setRitualText(RITUAL_TEMPLATE);
    setIsGenerated(true);
    setTickerError("");
    toast.success("Ritual template ready. Fill in your responses.");
  };

  const handleRunPipeline = async () => {
    // Validate ticker first (required)
    if (!ticker.trim()) {
      toast.error("Please enter a ticker symbol (e.g., TSLA, AAPL, PLAB)");
      return;
    }

    if (!validateTicker(ticker)) {
      toast.error("Invalid ticker symbol format");
      return;
    }

    // If ritual is empty, auto-fill with default template
    let finalRitualText = ritualText.trim();
    if (!finalRitualText) {
      console.log("[DailyRitual] Auto-filling default ritual template");
      finalRitualText = RITUAL_TEMPLATE;
      setRitualText(RITUAL_TEMPLATE);
      toast.info("Using default ritual template. Edit to customize.", { duration: 2 });
    }

    setIsProcessing(true);
    try {
      console.log("[DailyRitual] Creating pipeline run...");
      const runResult = await createRunMutation.mutateAsync({
        runName: `Daily Ritual - ${new Date().toLocaleDateString()}`,
        executionMode: "full_pipeline",
        metadata: {
          ritualData: { ritual: finalRitualText },
          timestamp: new Date().toISOString(),
          source: "daily_ritual",
        },
      });
      console.log("[DailyRitual] Run created:", runResult);

      console.log("[DailyRitual] Executing full pipeline...");
      await executeFullMutation.mutateAsync({
        runId: runResult.runId,
        inputs: { ritual: ritualText, userInputs: ticker },
      });
      console.log("[DailyRitual] Pipeline completed!");

      localStorage.removeItem("dailyRitualSession");
      toast.success("Ritual processed successfully!");
      setTimeout(() => {
        navigate(`/summary/${runResult.runId}`);
      }, 1000);
    } catch (error: any) {
      const errorMessage = error?.message || error?.data?.message || "Unknown error";
      toast.error(`Failed to process ritual: ${errorMessage}`);
      console.error("[DailyRitual] Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearReset = () => {
    setRitualText("");
    setTicker("");
    setIsGenerated(false);
    setTickerError("");
    localStorage.removeItem("dailyRitualSession");
    setShowClearConfirm(false);
    toast.success("Ritual cleared.");
  };

  const handleExportRitual = () => {
    try {
      if (!ritualText.trim()) {
        toast.error("No ritual content to export");
        return;
      }

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - (margin * 2);
      const footerY = pageHeight - 10;
      
      let yPosition = margin;
      let pageNumber = 1;
      
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
        pdf.text(`Generated: ${new Date().toISOString()}`, margin, footerY, { align: 'left' });
        pdf.setTextColor(0, 0, 0);
      };

      // Brand header
      pdf.setFillColor(251, 191, 36);
      pdf.rect(0, 0, pageWidth, 20, 'F');
      
      pdf.setFontSize(18);
      pdf.setFont('Helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('Daily Trading Ritual Report', margin, 12);
      yPosition = 28;
      
      // Metadata section
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, margin, yPosition);
      yPosition += 6;
      
      if (ticker) {
        pdf.setFont('Helvetica', 'bold');
        pdf.text('Primary Ticker Symbol:', margin, yPosition);
        yPosition += 5;
        pdf.setFont('Helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.setTextColor(59, 130, 246);
        pdf.text(ticker, margin + 5, yPosition);
        pdf.setTextColor(0, 0, 0);
        yPosition += 8;
      }
      
      // Section divider
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      
      // Ritual content section
      pdf.setFontSize(11);
      pdf.setFont('Helvetica', 'bold');
      pdf.text('Ritual Notes:', margin, yPosition);
      yPosition += 7;
      
      pdf.setFontSize(10);
      pdf.setFont('Helvetica', 'normal');
      const splitText = pdf.splitTextToSize(ritualText, maxWidth - 5);
      const lineHeight = 5.5;
      
      splitText.forEach((line: string) => {
        if (yPosition > footerY - 10) {
          addFooter();
          pdf.addPage();
          pageNumber++;
          yPosition = margin;
        }
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });
      
      addFooter();
      
      // Save with metadata
      pdf.setProperties({
        title: 'Daily Trading Ritual',
        subject: `Daily Ritual for ${ticker || 'Multiple Tickers'}`,
        author: 'Trading Ritual System',
        creator: 'Rag Swing Trading Pipeline',
        keywords: 'trading, ritual, analysis'
      });
      
      pdf.save(`Daily_Ritual_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Ritual exported as PDF successfully");
    } catch (error) {
      console.error("Error exporting ritual:", error);
      toast.error("Failed to export ritual");
    }
  };

  // Landing page - before ritual is generated
  if (!isGenerated) {
    return (
      <div className={`min-h-screen ${theme === "dark" ? "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-b from-amber-50 via-slate-50 to-slate-100"} flex items-center justify-center p-4`}>
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <Sun className={`w-20 h-20 ${theme === "dark" ? "text-amber-400" : "text-amber-400"} animate-pulse`} />
            </div>
            <h1 className={`text-4xl font-light ${theme === "dark" ? "text-slate-100" : "text-slate-900"} mb-2`}>Daily Ritual</h1>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"} mb-1`}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <p className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"} mt-4 leading-relaxed`}>
              Just enter a ticker. Auto-filled template. One submission.
            </p>
          </div>

          {/* Main Card */}
          <Card className={`${theme === "dark" ? "border-slate-700 bg-slate-800" : "border-amber-200 bg-white"} shadow-xl`}>
            <CardHeader className="text-center pb-6">
              <CardTitle className={`${theme === "dark" ? "text-slate-100" : "text-slate-900"} text-xl`}>Begin Your Ritual</CardTitle>
              <CardDescription className={`text-xs ${theme === "dark" ? "text-slate-400" : ""}`}>
                Generate a single template to clarify your trading decisions for today.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handleGenerateRitual}
                size="lg"
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg h-12 text-base font-medium transition-all hover:shadow-xl"
              >
                <Sun className="w-5 h-5 mr-2" />
                Generate Daily Ritual
              </Button>

              <div className={`pt-2 border-t ${theme === "dark" ? "border-slate-700" : "border-slate-200"}`}>
                <p className={`text-xs ${theme === "dark" ? "text-slate-500" : "text-slate-500"} text-center leading-relaxed`}>
                  This will open a single text editor with your ritual template.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Mode Link */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className={`text-xs ${theme === "dark" ? "text-slate-400 hover:text-slate-300" : "text-slate-500 hover:text-slate-700"} transition-colors flex items-center justify-center gap-1 mx-auto`}
            >
              <Settings className="w-3 h-3" />
              Advanced Mode
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Advanced Mode Panel */}
          {showAdvanced && (
            <div className={`mt-4 p-4 ${theme === "dark" ? "bg-slate-700 border-slate-600" : "bg-slate-100 border-slate-300"} rounded-lg border animate-in fade-in`}>
              <p className={`text-xs font-medium mb-3 ${theme === "dark" ? "text-slate-100" : "text-slate-700"}`}>Advanced Mode</p>
              <p className={`text-xs mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Access individual pipeline stages for detailed, step-by-step analysis instead of the unified ritual.
              </p>
              <Button
                onClick={() => navigate("/pipeline")}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Go to 9-Stage Pipeline
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ritual editor - after ritual is generated
  return (
    <PageLayout
      title="Daily Ritual"
      subtitle={new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}
    >
      {/* Main Content */}
      <div className="max-w-3xl">
        <Card className={`${theme === "dark" ? "border-slate-700" : "border-slate-200"} shadow-lg h-full flex flex-col`}>
          <CardHeader className="pb-3">
            <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>Your Ritual</CardTitle>
            <CardDescription className="text-xs">Fill in the ticker (required). Ritual template is optional — leave blank to auto-fill with default template.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col pb-0 gap-4">
            {/* Ticker Input */}
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Primary Ticker Symbol
              </label>
              <Input
                value={ticker}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setTicker(value);
                  validateTicker(value);
                }}
                onBlur={() => validateTicker(ticker)}
                placeholder="e.g., TSLA, AAPL, BRK.B"
                className={`${tickerError ? (theme === "dark" ? "border-red-500 focus:border-red-500" : "border-red-400 focus:border-red-400") : (theme === "dark" ? "border-slate-600 focus:border-amber-400" : "border-slate-200 focus:border-amber-400")} ${theme === "dark" ? "bg-slate-800 text-slate-100 focus:ring-amber-900/30" : "focus:ring-amber-100"} font-mono text-sm`}
                maxLength={8}
              />
              {tickerError && (
                <div className="flex items-center gap-2 text-red-500 text-xs">
                  <AlertCircle className="w-3 h-3" />
                  {tickerError}
                </div>
              )}
            </div>

            {/* Ritual Textarea */}
            <div className="flex-1 flex flex-col gap-2">
              <label className={`text-sm font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                Ritual Notes
              </label>
              <Textarea
                value={ritualText}
                onChange={(e) => setRitualText(e.target.value)}
                className={`flex-1 resize-none ${theme === "dark" ? "border-slate-600 bg-slate-800 text-slate-100 focus:border-amber-400 focus:ring-amber-900/30" : "border-slate-200 focus:border-amber-400 focus:ring-amber-100"} font-mono text-sm leading-relaxed`}
                placeholder="Your ritual template..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sticky Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Button
          onClick={() => setShowClearConfirm(true)}
          variant="outline"
          disabled={isProcessing}
          title="Escape"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Clear & Reset
        </Button>
        <Button
          onClick={handleExportRitual}
          disabled={isProcessing || !ritualText.trim()}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Export Ritual
        </Button>
        <Button
          onClick={() => setShowPipelineConfirm(true)}
          disabled={isProcessing}
          className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
          size="lg"
          title="Ctrl+Enter"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Full Pipeline
            </>
          )}
        </Button>
      </div>

      {/* Advanced Mode Modal */}
      {showAdvanced && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className={theme === "dark" ? "max-w-sm w-full bg-slate-800 border-slate-700" : "max-w-sm w-full"}>
            <CardHeader>
              <CardTitle className={theme === "dark" ? "text-slate-100" : "text-slate-900"}>Advanced Mode</CardTitle>
              <CardDescription>Access the 9-stage pipeline</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Switch to the full 9-stage pipeline for detailed, step-by-step analysis of each trading decision stage.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowAdvanced(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => navigate("/pipeline")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  Go to Pipeline
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Clear Confirmation Dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={theme === "dark" ? "text-slate-100" : ""}>Clear Daily Ritual?</AlertDialogTitle>
            <AlertDialogDescription className={theme === "dark" ? "text-slate-400" : ""}>
              Are you sure you want to clear your ritual and reset the form? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel className={theme === "dark" ? "border-slate-600" : ""}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleClearReset}
            className="bg-red-600 hover:bg-red-700"
          >
            Clear Everything
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pipeline Confirmation Dialog */}
      <AlertDialog open={showPipelineConfirm} onOpenChange={setShowPipelineConfirm}>
        <AlertDialogContent className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}>
          <AlertDialogHeader>
            <AlertDialogTitle className={theme === "dark" ? "text-slate-100" : ""}>Run Full Pipeline?</AlertDialogTitle>
            <AlertDialogDescription className={theme === "dark" ? "text-slate-400" : ""}>
              This will process your ritual and execute the full trading analysis pipeline for {ticker || "your selected ticker"}. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogCancel className={theme === "dark" ? "border-slate-600" : ""}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowPipelineConfirm(false);
              handleRunPipeline();
            }}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Run Pipeline
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
