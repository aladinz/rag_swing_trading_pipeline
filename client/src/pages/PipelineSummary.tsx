import React, { useState } from "react";
import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import jsPDF from "jspdf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, ArrowLeft, CheckCircle2, AlertCircle, XCircle, Clock, Shield, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { PageLayout } from "@/components/PageLayout";

export default function PipelineSummary() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const [isRunningAudit, setIsRunningAudit] = useState(false);
  
  // Validate runId from URL
  const rawRunId = params.runId;
  const runId = rawRunId ? parseInt(rawRunId) : NaN;
  const isValidRunId = !isNaN(runId) && runId > 0;

  // Fetch all data
  const { data: run, isLoading: runLoading, error: runError } = trpc.pipeline.getRun.useQuery({ runId });
  const { data: summary, isLoading: summaryLoading } = trpc.pipeline.getSummary.useQuery({ runId });
  const { data: decision, isLoading: decisionLoading } = trpc.pipeline.getTradingDecision.useQuery({ runId });
  const { data: allStages, isLoading: stagesLoading } = trpc.pipeline.getAllStages.useQuery({ runId });
  const { data: auditorReport, isLoading: auditorLoading, refetch: refetchAudit } = trpc.auditor.getReport.useQuery({ runId });
  
  // Mutation for running audit
  const runAuditMutation = trpc.auditor.runAudit.useMutation();

  // Show error if runId is invalid
  if (!isValidRunId) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              <CardTitle className="text-red-900 dark:text-red-400">Invalid Run ID</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              The run ID "{rawRunId || "(empty)"}" is not valid.
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
              A valid run ID must be a positive number.
            </p>
            <Button onClick={() => navigate("/pipeline")} className="w-full">
              Return to Pipeline Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleRunAudit = async () => {
    setIsRunningAudit(true);
    try {
      await runAuditMutation.mutateAsync({
        runId,
        portfolioData: {
          stages: allStages?.map((s) => ({
            number: s.stageNumber,
            name: s.stageName,
            analysis: s.rawOutput || ""
          })) || [],
          decision: decision,
          summary: summary,
        }
      });
      
      // Refetch the audit report
      await refetchAudit();
      toast.success("Audit analysis completed");
    } catch (error) {
      console.error("Error running audit:", error);
      toast.error("Failed to run audit analysis");
    } finally {
      setIsRunningAudit(false);
    }
  };

  const handleExportAuditPDF = async () => {
    try {
      const element = document.getElementById("audit-report-content");
      if (!element) {
        toast.error("Audit report not found");
        return;
      }

      // Extract text content from the audit report
      const textContent = element.innerText || element.textContent || "";
      
      if (!textContent.trim()) {
        toast.error("No content to export");
        return;
      }
      
      // Create a blob and download
      const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Portfolio_Audit_Report_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Audit report exported successfully");
    } catch (error) {
      console.error("Error exporting audit report:", error);
      toast.error("Failed to export audit report");
    }
  };

  const isLoading = runLoading || summaryLoading || decisionLoading || stagesLoading || auditorLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading pipeline results...</p>
        </div>
      </div>
    );
  }

  if (runError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-600" />
              <CardTitle className="text-red-900 dark:text-red-400">Error Loading Run</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Failed to load pipeline run #{runId}: {runError.message}
            </p>
            <Button onClick={() => navigate("/pipeline")} className="w-full">
              Return to Pipeline Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <CardTitle>Pipeline Run Not Found</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              No pipeline run found with ID #{runId}. It may have been deleted or never existed.
            </p>
            <Button onClick={() => navigate("/pipeline")} className="w-full">
              Return to Pipeline Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportPDF = () => {
    try {
      const element = document.getElementById("summary-content");
      if (!element) {
        toast.error("Summary content not found");
        return;
      }

      // Extract text content from the summary
      const textContent = element.innerText || element.textContent || "";
      
      if (!textContent.trim()) {
        toast.error("No content to export");
        return;
      }
      
      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 7;
      const maxWidth = pageWidth - (margin * 2);
      const footerY = pageHeight - 10;
      
      let yPosition = margin;
      let pageNumber = 1;
      let totalPages = 1;
      
      // Calculate total pages for page numbering
      pdf.setFontSize(11);
      const splitText = pdf.splitTextToSize(textContent, maxWidth);
      let tempY = margin + 30;
      splitText.forEach((line: string) => {
        if (tempY > pageHeight - margin) {
          totalPages++;
          tempY = margin;
        }
        tempY += lineHeight;
      });
      
      const addPageNumbers = () => {
        if (totalPages > 1) {
          pdf.setFontSize(8);
          pdf.setFont('Helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }
      };
      
      // Branding header
      pdf.setFillColor(251, 191, 36);
      pdf.rect(0, 0, pageWidth, 20, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('RAG Swing-Trading Pipeline', margin, 12);
      yPosition = 28;
      
      // Metadata section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 6;
      
      pdf.text(`Run ID: ${runId}`, margin, yPosition);
      yPosition += 8;
      
      // Divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      
      // Add content with word wrapping
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      const finalSplitText = pdf.splitTextToSize(textContent, maxWidth);
      
      finalSplitText.forEach((line: string) => {
        if (yPosition > pageHeight - margin - 5) {
          addPageNumbers();
          pdf.addPage();
          pageNumber++;
          yPosition = margin;
          
          // Add branding header to new pages
          pdf.setFillColor(251, 191, 36);
          pdf.rect(0, 0, pageWidth, 20, 'F');
          pdf.setFontSize(14);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(59, 130, 246);
          pdf.text('RAG Swing-Trading Pipeline', margin, 12);
          yPosition = 28;
          pdf.setTextColor(0, 0, 0);
        }
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
      
      addPageNumbers();
      
      // Save PDF
      pdf.save(`Pipeline_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Summary exported as PDF successfully");
    } catch (error) {
      console.error("Error exporting summary:", error);
      toast.error("Failed to export summary");
    }
  };

  const handleExportAllStages = () => {
    try {
      if (!allStages || allStages.length === 0) {
        toast.error("No stages data to export");
        return;
      }

      // Create PDF document
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const lineHeight = 5.5;
      const maxWidth = pageWidth - (margin * 2);
      const footerY = pageHeight - 10;
      
      let yPosition = margin;
      let pageNumber = 1;
      let isFirstPage = true;
      
      const addPageNumbers = () => {
        pdf.setFontSize(8);
        pdf.setFont('Helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${pageNumber}`, pageWidth / 2, footerY, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      };
      
      // Branding header on first page
      pdf.setFillColor(251, 191, 36);
      pdf.rect(0, 0, pageWidth, 20, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('RAG Swing-Trading Pipeline', margin, 12);
      yPosition = 28;
      
      // Metadata section
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 6;
      
      pdf.text(`Run ID: ${runId}`, margin, yPosition);
      yPosition += 8;
      
      // Divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      
      // Add each stage
      allStages.forEach((stage) => {
        // Add stage header
        if (yPosition > pageHeight - 40) {
          addPageNumbers();
          pdf.addPage();
          pageNumber++;
          yPosition = margin;
        }
        
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`STAGE ${stage.stageNumber}: ${stage.stageName}`, margin, yPosition);
        yPosition += 7;
        
        // Stage info
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Status: ${stage.status}`, margin + 5, yPosition);
        yPosition += 5;
        
        if (stage.timestamp) {
          pdf.text(`Timestamp: ${new Date(stage.timestamp).toLocaleString()}`, margin + 5, yPosition);
          yPosition += 5;
        }
        
        // Stage content
        yPosition += 2;
        if (stage.hasData && stage.rawOutput) {
          const contentLines = pdf.splitTextToSize(stage.rawOutput, maxWidth - 10);
          contentLines.forEach((line: string) => {
            if (yPosition > pageHeight - margin - 5) {
              addPageNumbers();
              pdf.addPage();
              pageNumber++;
              yPosition = margin;
            }
            pdf.setFontSize(8);
            pdf.text(line, margin + 5, yPosition);
            yPosition += lineHeight;
          });
        } else {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.text("[This stage has not been executed yet]", margin + 5, yPosition);
          yPosition += 5;
        }
        
        yPosition += 5;
      });
      
      addPageNumbers();
      
      // Save PDF
      pdf.save(`All_Stages_Analysis_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("All stages exported as PDF successfully");
    } catch (error) {
      console.error("Error exporting all stages:", error);
      toast.error("Failed to export all stages");
    }
  };

  // Get decision values with fallbacks
  const decisionSymbol = decision?.symbol && decision.symbol !== "UNKNOWN" ? decision.symbol : null;
  const decisionTargetPrice = decision?.targetPrice && decision.targetPrice !== "0.00" ? decision.targetPrice : null;
  const decisionStopLoss = decision?.stopLoss && decision.stopLoss !== "0.00" ? decision.stopLoss : null;
  const isDecisionReady = decision && decision.decision !== "PENDING" && decisionSymbol;

  // Extract confidence levels from stage outputs
  const extractConfidence = (output: string | null): string | null => {
    if (!output) return null;
    const match = output.match(/Confidence Level[:\s]*(\d+%?)/i);
    return match ? match[1] : null;
  };

  // Extract key insights from stage output
  const extractKeyInsights = (output: string | null): string[] => {
    if (!output) return [];
    const insights: string[] = [];
    
    // Look for bullet points or key findings
    const lines = output.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ✅') || trimmed.startsWith('✅') || 
          trimmed.startsWith('- **') || trimmed.startsWith('* ')) {
        insights.push(trimmed.replace(/^[-*✅\s]+/, '').trim());
      }
    }

    return insights.slice(0, 5); // Limit to 5 key insights
  };

  // Parse recommended actions safely
  const parseRecommendedActions = (actions: unknown): string[] => {
    if (!actions) return [];
    if (Array.isArray(actions)) return actions.map(a => String(a));
    try {
      const parsed = JSON.parse(String(actions));
      if (Array.isArray(parsed)) return parsed.map((a: unknown) => String(a));
    } catch {
      return [String(actions)];
    }
    return [String(actions)];
  };

  return (
    <PageLayout
      title={run?.runName || "Pipeline Summary"}
      subtitle={run?.status === "completed" ? `Completed on ${new Date(run.completedAt || run.updatedAt).toLocaleDateString()}` : `Status: ${run?.status}`}
    >
      <Tabs defaultValue="summary" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="stages">All Stages</TabsTrigger>
            <TabsTrigger value="decision">Decision</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-6">
            <div className="flex justify-between items-center mb-4 gap-4">
              <div>
                <h3 className="text-lg font-semibold">Pipeline Analysis Summary</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Consolidated findings from all 9 stages</p>
              </div>
              <Button
                onClick={handleExportPDF}
                className="gap-2 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
            <div id="summary-content">
              {summary ? (
                <>
                  <Card>
                  <CardHeader>
                    <CardTitle>Pipeline Analysis Summary</CardTitle>
                    <CardDescription>Consolidated findings from all 9 stages</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Streamdown>{String(summary.overallAnalysis || "Analysis summary pending...")}</Streamdown>
                    </div>

                    {summary.riskAssessment && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                        <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Risk Assessment</h3>
                        <p className="text-sm text-amber-800 dark:text-amber-200">{String(summary.riskAssessment)}</p>
                      </div>
                    )}

                    {summary.recommendedActions ? (
                      <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                        <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">Recommended Actions</h3>
                        <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                          {parseRecommendedActions(summary.recommendedActions).map((action, idx) => (
                            <li key={idx} className="flex gap-2">
                              <span>•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <CardTitle>Summary Not Available</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                    The pipeline summary has not been generated yet.
                  </p>
                  <p className="text-sm text-slate-500">
                    This could mean the pipeline is still running or encountered an error before completing.
                    Check the "All Stages" tab to see individual stage outputs.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          </TabsContent>

          {/* All Stages Tab - Shows all 9 stages with their outputs */}
          <TabsContent value="stages" className="space-y-4">
            <div className="flex justify-between items-center mb-4 gap-4">
              <div>
                <h3 className="text-lg font-semibold">Stage-by-Stage Analysis</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">Detailed output from each of the 9 pipeline stages</p>
              </div>
              <Button
                onClick={handleExportAllStages}
                disabled={!allStages || allStages.length === 0}
                variant="outline"
                className="gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                Export All Stages
              </Button>
            </div>
            <div id="all-stages-content">

            {allStages && allStages.length > 0 ? (
              allStages.map((stage) => (
                <Card key={stage.stageNumber} className={`border-l-4 ${
                  stage.status === "completed" ? "border-l-green-500" :
                  stage.status === "failed" ? "border-l-red-500" :
                  stage.status === "in_progress" ? "border-l-blue-500" :
                  "border-l-slate-300"
                }`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                          stage.status === "completed" ? "bg-green-600" :
                          stage.status === "failed" ? "bg-red-600" :
                          stage.status === "in_progress" ? "bg-blue-600" :
                          "bg-slate-400"
                        }`}>
                          {stage.stageNumber}
                        </span>
                        <div>
                          <CardTitle className="text-lg">{stage.stageName}</CardTitle>
                          <CardDescription>
                            Stage {stage.stageNumber} of 9 • Status: {stage.status}
                          </CardDescription>
                        </div>
                      </div>
                      {stage.timestamp && (
                        <span className="text-xs text-slate-500">
                          {new Date(stage.timestamp).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stage.hasData && stage.rawOutput ? (
                      <div className="space-y-4">
                        {/* Main Output */}
                        <div className="prose prose-sm max-w-none dark:prose-invert bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                          <Streamdown>{stage.rawOutput}</Streamdown>
                        </div>

                        {/* Confidence Level */}
                        {((): React.ReactNode => {
                          const confidence = extractConfidence(stage.rawOutput);
                          if (confidence) {
                            return (
                              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  Confidence Level:
                                </span>
                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
                                  {confidence}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Key Insights */}
                        {((): React.ReactNode => {
                          const insights = extractKeyInsights(stage.rawOutput);
                          if (insights.length > 0) {
                            return (
                              <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                                  Key Insights:
                                </p>
                                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                                  {insights.map((insight, idx) => (
                                    <li key={idx}>• {insight}</li>
                                  ))}
                                </ul>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <AlertCircle className="w-4 h-4" />
                          <span className="font-medium">No data for this stage</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {stage.status === "pending" 
                            ? "This stage has not been executed yet."
                            : stage.status === "failed"
                            ? "This stage failed to produce output."
                            : "No output was captured for this stage."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              // Show all 9 stages with no data if allStages is empty
              Array.from({ length: 9 }, (_, i) => i + 1).map((stageNum) => (
                <Card key={stageNum} className="border-l-4 border-l-slate-300">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-400 text-white text-sm font-bold">
                        {stageNum}
                      </span>
                      <div>
                        <CardTitle className="text-lg">Stage {stageNum}</CardTitle>
                        <CardDescription>Status: Not executed</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">No data for this stage</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        This stage has not been executed yet.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            </div>
          </TabsContent>

          {/* Decision Tab */}
          <TabsContent value="decision" className="space-y-6">
            {/* Key Decision Cards - Always show, with fallback values */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className={`border-2 ${isDecisionReady ? "border-green-200 bg-green-50 dark:bg-green-950" : "border-slate-200 bg-slate-50 dark:bg-slate-800"}`}>
                <CardHeader className="pb-2">
                  <p className={`text-xs font-medium uppercase tracking-wide ${isDecisionReady ? "text-green-600" : "text-slate-500"}`}>Decision</p>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${isDecisionReady ? "text-green-900 dark:text-green-100" : "text-slate-600 dark:text-slate-400"}`}>
                    {decision?.decision && decision.decision !== "PENDING" ? decision.decision : "Not available"}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${decisionSymbol ? "border-blue-200 bg-blue-50 dark:bg-blue-950" : "border-slate-200 bg-slate-50 dark:bg-slate-800"}`}>
                <CardHeader className="pb-2">
                  <p className={`text-xs font-medium uppercase tracking-wide ${decisionSymbol ? "text-blue-600" : "text-slate-500"}`}>Symbol</p>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${decisionSymbol ? "text-blue-900 dark:text-blue-100" : "text-slate-600 dark:text-slate-400"}`}>
                    {decisionSymbol || "Not available"}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${decisionTargetPrice ? "border-amber-200 bg-amber-50 dark:bg-amber-950" : "border-slate-200 bg-slate-50 dark:bg-slate-800"}`}>
                <CardHeader className="pb-2">
                  <p className={`text-xs font-medium uppercase tracking-wide ${decisionTargetPrice ? "text-amber-600" : "text-slate-500"}`}>Target Price</p>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${decisionTargetPrice ? "text-amber-900 dark:text-amber-100" : "text-slate-600 dark:text-slate-400"}`}>
                    {decisionTargetPrice ? `$${decisionTargetPrice}` : "Not available"}
                  </p>
                </CardContent>
              </Card>

              <Card className={`border-2 ${decisionStopLoss ? "border-red-200 bg-red-50 dark:bg-red-950" : "border-slate-200 bg-slate-50 dark:bg-slate-800"}`}>
                <CardHeader className="pb-2">
                  <p className={`text-xs font-medium uppercase tracking-wide ${decisionStopLoss ? "text-red-600" : "text-slate-500"}`}>Stop Loss</p>
                </CardHeader>
                <CardContent>
                  <p className={`text-2xl font-bold ${decisionStopLoss ? "text-red-900 dark:text-red-100" : "text-slate-600 dark:text-slate-400"}`}>
                    {decisionStopLoss ? `$${decisionStopLoss}` : "Not available"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Rationale */}
            <Card className="border-2 border-slate-300 dark:border-slate-600">
              <CardHeader>
                <CardTitle className="text-lg">Trading Rationale</CardTitle>
                <CardDescription>Comprehensive analysis supporting this decision</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {decision?.rationale && decision.rationale !== "Pipeline analysis in progress..." ? (
                  <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 dark:prose-invert">
                    <Streamdown>{String(decision.rationale)}</Streamdown>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <p className="text-slate-600 dark:text-slate-400">
                      Rationale not available. Check stages 6-8 for execution guidance and decision details.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Position Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Risk/Reward Ratio</p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {decision?.riskReward && decision.riskReward !== "N/A" ? decision.riskReward : "Not available"}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Ratio of potential profit to potential loss</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">Quantity</p>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {decision?.quantity && decision.quantity !== "0" ? decision.quantity : "Not available"}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Number of shares/contracts to trade</p>
                </CardContent>
              </Card>
            </div>

            {/* Status message if not ready */}
            {!isDecisionReady && (
              <Card className="border-2 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <CardTitle className="text-amber-900 dark:text-amber-100">Decision Pending</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-amber-800 dark:text-amber-200">
                    The trading decision will be populated once stages 6-8 complete execution.
                    Check the "All Stages" tab to see which stages have completed.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pipeline Execution Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Run ID</p>
                    <p className="font-mono text-sm text-slate-900 dark:text-slate-100">{run.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Execution Mode</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100 capitalize">{run.executionMode.replace("_", " ")}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Status</p>
                    <p className={`text-sm capitalize ${
                      run.status === "completed" ? "text-green-600" :
                      run.status === "failed" ? "text-red-600" :
                      "text-slate-900 dark:text-slate-100"
                    }`}>{run.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Stages Completed</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{run.currentStage}/{run.totalStages}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Created</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{new Date(run.createdAt).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Last Updated</p>
                    <p className="text-sm text-slate-900 dark:text-slate-100">{new Date(run.updatedAt).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stage Completion Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Stage Completion Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-9 gap-2">
                  {(allStages || Array.from({ length: 9 }, (_, i) => ({ stageNumber: i + 1, status: "pending", hasData: false }))).map((stage) => (
                    <div 
                      key={stage.stageNumber}
                      className={`p-3 rounded-lg text-center ${
                        stage.status === "completed" ? "bg-green-100 dark:bg-green-900" :
                        stage.status === "failed" ? "bg-red-100 dark:bg-red-900" :
                        stage.status === "in_progress" ? "bg-blue-100 dark:bg-blue-900" :
                        "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <p className="text-lg font-bold">{stage.stageNumber}</p>
                      <p className={`text-xs ${
                        stage.status === "completed" ? "text-green-700 dark:text-green-300" :
                        stage.status === "failed" ? "text-red-700 dark:text-red-300" :
                        stage.status === "in_progress" ? "text-blue-700 dark:text-blue-300" :
                        "text-slate-500"
                      }`}>
                        {stage.status === "completed" ? "✓" : 
                         stage.status === "failed" ? "✗" :
                         stage.status === "in_progress" ? "..." : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Tab */}
          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Portfolio Audit Analysis
                    </CardTitle>
                    <CardDescription>Comprehensive risk assessment and portfolio analysis</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleExportAuditPDF}
                      disabled={!auditorReport}
                      variant="outline"
                      className="gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export PDF
                    </Button>
                    <Button
                      onClick={handleRunAudit}
                      disabled={isRunningAudit || !allStages || allStages.length === 0}
                      className="gap-2"
                    >
                      {isRunningAudit ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Running Audit...
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4" />
                          {auditorReport ? "Re-Run Audit" : "Run Audit"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div id="audit-report-content">
                {!auditorReport ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-lg">
                    <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 dark:text-slate-400 mb-2">No audit analysis yet</p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mb-4">
                      Click "Run Audit" to analyze this portfolio for collapse risk.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {typeof auditorReport === "string" && (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <Streamdown>{auditorReport}</Streamdown>
                      </div>
                    )}

                    {typeof auditorReport === "object" && auditorReport !== null && (
                      <>
                        {/* Executive Summary */}
                        {/* Executive Summary - Light mode only */}
                        {(auditorReport as any).executiveSummary && (
                          <Card className="border-2 border-slate-300 bg-white">
                            <CardContent className="pt-6">
                              <div className="prose prose-sm max-w-none">
                                <Streamdown>{String((auditorReport as any).executiveSummary)}</Streamdown>
                              </div>
                            </CardContent>
                          </Card>
                        )}

                        {/* Overall Risk Score */}
                        {(auditorReport as any).overallRiskScore !== undefined && (
                          <Card>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle>Overall Risk Score</CardTitle>
                                <span className={`px-4 py-2 rounded-lg font-bold text-lg ${
                                  (auditorReport as any).overallRiskScore <= 3 ? "bg-green-100 text-green-800" :
                                  (auditorReport as any).overallRiskScore <= 6 ? "bg-amber-100 text-amber-800" :
                                  "bg-red-100 text-red-800"
                                }`}>
                                  {(auditorReport as any).overallRiskScore}/10
                                </span>
                              </div>
                            </CardHeader>
                          </Card>
                        )}

                        {/* Detailed sections if available */}
                        {Object.entries(auditorReport as any).map(([key, section]: [string, any]) => {
                          if (["executiveSummary", "overallRiskScore"].includes(key) || !section || typeof section !== "object") {
                            return null;
                          }
                          if (section.title) {
                            return (
                              <Card key={key} className={`border-2 ${
                                section.riskScore <= 3 ? "border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800" :
                                section.riskScore <= 6 ? "border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800" :
                                "border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800"
                              }`}>
                                <CardHeader>
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <CardTitle>{section.title}</CardTitle>
                                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">{section.overview}</p>
                                    </div>
                                    {section.riskScore !== undefined && (
                                      <div className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${
                                        section.riskScore <= 3 ? "bg-green-100 text-green-800" :
                                        section.riskScore <= 6 ? "bg-amber-100 text-amber-800" :
                                        "bg-red-100 text-red-800"
                                      }`}>
                                        Risk: {section.riskScore}/10
                                      </div>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                  {section.keyFindings && section.keyFindings.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Key Findings</h4>
                                      <ul className="space-y-2">
                                        {(Array.isArray(section.keyFindings) ? section.keyFindings : [section.keyFindings]).map((finding: any, idx: number) => (
                                          <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-slate-400 min-w-fit">•</span>
                                            <span>{String(finding)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {section.recommendations && section.recommendations.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Recommendations</h4>
                                      <ul className="space-y-2">
                                        {(Array.isArray(section.recommendations) ? section.recommendations : [section.recommendations]).map((rec: any, idx: number) => (
                                          <li key={idx} className="flex gap-3 text-sm text-slate-700 dark:text-slate-300">
                                            <span className="text-blue-400 min-w-fit">→</span>
                                            <span>{String(rec)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}

                                  {section.criticalIssues && section.criticalIssues.length > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                                      <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3">Critical Issues</h4>
                                      <ul className="space-y-2">
                                        {(Array.isArray(section.criticalIssues) ? section.criticalIssues : [section.criticalIssues]).map((issue: any, idx: number) => (
                                          <li key={idx} className="flex gap-3 text-sm text-red-800 dark:text-red-200">
                                            <span className="text-red-500 font-semibold min-w-fit">⚠</span>
                                            <span>{String(issue)}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          }
                          return null;
                        })}
                      </>
                    )}
                  </div>
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => navigate("/pipeline")}
            variant="outline"
          >
            Back to Pipeline
          </Button>
          <Button
            onClick={() => navigate("/")}
            variant="outline"
          >
            Home
          </Button>
        </div>
    </PageLayout>
  );
}
