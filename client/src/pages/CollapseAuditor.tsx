import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Play, Loader2, TrendingDown, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import jsPDF from "jspdf";
import { PageLayout } from "@/components/PageLayout";

interface AuditSection {
  title: string;
  overview: string;
  keyFindings: string[];
  riskScore: number;
  recommendations: string[];
  criticalIssues: string[];
}

interface AuditResult {
  portfolioStructure: AuditSection;
  correlationRisk: AuditSection;
  volatilityExposure: AuditSection;
  signalQuality: AuditSection;
  narrativeDrift: AuditSection;
  overallRiskScore: number;
  executiveSummary: string;
}

function getRiskColor(score: number): string {
  if (score <= 3) return "text-green-700 bg-green-50 border-green-200";
  if (score <= 6) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function getRiskBadgeColor(score: number): string {
  if (score <= 3) return "bg-green-100 text-green-800";
  if (score <= 6) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

// Clean color code markers and progress bars from text
function cleanColorCodes(text: string): string {
  const result = text
    .replace(/\s*\[\s*(GREEN|YELLOW|RED)\s*\]\s*/gi, '')  // Remove color codes
    .replace(/\[\s*[█\-\s]+\s*\]/g, '')  // Remove progress bars like [███-------]
    .trim();
  
  if (text.includes("[") && !result.includes("[")) {
    console.log("[UI] ✓ Cleaned color codes from:", text.substring(0, 60));
  } else if (text.includes("[") && result.includes("[")) {
    console.log("[UI] ❌ Failed to clean:", text.substring(0, 60));
  }
  
  return result;
}

// Clean all strings in an audit section
function cleanAuditSection(section: AuditSection): AuditSection {
  return {
    ...section,
    overview: cleanColorCodes(section.overview),
    keyFindings: section.keyFindings.map(cleanColorCodes),
    recommendations: section.recommendations.map(cleanColorCodes),
    criticalIssues: section.criticalIssues.map(cleanColorCodes),
  };
}

function AuditSectionCard({ section: rawSection }: { section: AuditSection }) {
  // Clean the section data in case color codes slipped through from server
  const section = cleanAuditSection(rawSection);
  
  return (
    <Card className={`border-2 ${getRiskColor(section.riskScore)}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <CardDescription className="mt-2">{section.overview}</CardDescription>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskBadgeColor(section.riskScore)}`}>
            Risk: {section.riskScore}/10
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Findings */}
        {section.keyFindings && section.keyFindings.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Key Findings
            </h4>
            <ul className="space-y-2">
              {section.keyFindings.map((finding, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-700">
                  <span className="text-slate-400 font-semibold min-w-fit">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {section.recommendations && section.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              Recommendations
            </h4>
            <ul className="space-y-2">
              {section.recommendations.map((rec, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-700">
                  <span className="text-blue-400 font-semibold min-w-fit">→</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Critical Issues */}
        {section.criticalIssues && section.criticalIssues.length > 0 && (
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Critical Issues
            </h4>
            <ul className="space-y-2">
              {section.criticalIssues.map((issue, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-red-800">
                  <span className="text-red-500 font-semibold min-w-fit">⚠</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CollapseAuditor() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [portfolioData, setPortfolioData] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const runAuditMutation = trpc.auditor.runAudit.useMutation();
  const createRunMutation = trpc.pipeline.createRun.useMutation();

  const handleRunAudit = async () => {
    if (!portfolioData.trim()) {
      toast.error("Please provide portfolio data");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Create a pipeline run for context
      const runResult = await createRunMutation.mutateAsync({
        runName: "Collapse Audit - " + new Date().toLocaleDateString(),
        executionMode: "step_by_step",
        metadata: { auditOnly: true },
      });

      // Run the audit
      const result = await runAuditMutation.mutateAsync({
        runId: runResult.runId,
        portfolioData: { input: portfolioData, timestamp: new Date().toISOString() },
      });

      setAnalysisResult(result);
      toast.success("Audit analysis completed");
    } catch (error) {
      toast.error("Failed to run audit analysis");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExportReport = async () => {
    try {
      const element = document.getElementById("collapse-audit-report");
      if (!element) {
        toast.error("Report not found");
        return;
      }

      // Extract text content from the report
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
      const lineHeight = 6;
      const maxWidth = pageWidth - (margin * 2);
      const footerY = pageHeight - 10;
      
      let yPosition = margin;
      let pageNumber = 1;
      let totalPages = 1;
      
      // Calculate total pages for page numbering
      pdf.setFontSize(10);
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
      yPosition += 8;
      
      // Divider line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;
      
      // Add content with word wrapping
      pdf.setFontSize(10);
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
      pdf.save(`Collapse_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Report exported as PDF successfully");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Failed to export report");
    }
  };

  return (
    <PageLayout
      title="Collapse Auditor"
      subtitle="Comprehensive portfolio risk analysis and assessment"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Data Input</CardTitle>
                <CardDescription>Enter your holdings as comma-separated list with percentages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Portfolio Holdings</label>
                  <Textarea
                    value={portfolioData}
                    onChange={(e) => setPortfolioData(e.target.value)}
                    placeholder={`Example:
SGOV 50%, VTI 30%, VXUS 10%, SCHD 10%

Or with newlines:
AAPL 25%
MSFT 20%
JPM 15%
XOM 15%
GLD 10%
BND 15%`}
                    className="min-h-48"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Format: Enter holdings as comma-separated or newline-separated list with percentages (e.g., "AAPL 25%, MSFT 20%"). The system will analyze current market prices and collapse risk indicators for your specific holdings.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleRunAudit}
                    disabled={isAnalyzing || !portfolioData.trim()}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                    size="lg"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Portfolio...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Collapse Audit
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleExportReport}
                    disabled={!analysisResult}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Dimensions Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analysis Areas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { title: "Portfolio Structure", icon: "📊", desc: "Composition & diversification" },
                  { title: "Correlation Risk", icon: "🔗", desc: "Holdings relationships" },
                  { title: "Volatility Exposure", icon: "📈", desc: "Risk metrics" },
                  { title: "Signal Quality", icon: "✓", desc: "Trading signal assessment" },
                  { title: "Narrative Drift", icon: "🎯", desc: "Strategy consistency" },
                ].map((item) => (
                  <div key={item.title} className="p-3 bg-slate-100 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-600">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Risk Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-blue-900">
                  The auditor provides a comprehensive risk score (1-10) and identifies critical issues in your portfolio.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {analysisResult && (
          <div className="mt-12 space-y-8">
            {/* Executive Summary */}
            <Card className="border border-slate-300 bg-slate-50">
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-slate-800 prose-li:text-slate-800 prose-strong:text-slate-900 prose-table:text-slate-800 prose-th:text-slate-900 prose-th:bg-slate-200 prose-td:text-slate-800 prose-td:border-slate-300">
                  <Streamdown>{String(analysisResult.executiveSummary || "Audit analysis completed")}</Streamdown>
                </div>
              </CardContent>
            </Card>

            {/* Overall Risk Score */}
            <Card className={`border-2 ${getRiskColor(analysisResult.overallRiskScore || 5)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Overall Risk Assessment</CardTitle>
                  <div className={`px-4 py-2 rounded-lg text-lg font-bold ${getRiskBadgeColor(analysisResult.overallRiskScore || 5)}`}>
                    {analysisResult.overallRiskScore || 5}/10
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Detailed Analysis Sections */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Detailed Analysis</h2>
              
              {/* Portfolio Structure */}
              {analysisResult.portfolioStructure && <AuditSectionCard section={analysisResult.portfolioStructure} />}
              
              {/* Correlation Risk */}
              {analysisResult.correlationRisk && <AuditSectionCard section={analysisResult.correlationRisk} />}
              
              {/* Volatility Exposure */}
              {analysisResult.volatilityExposure && <AuditSectionCard section={analysisResult.volatilityExposure} />}
              
              {/* Signal Quality */}
              {analysisResult.signalQuality && <AuditSectionCard section={analysisResult.signalQuality} />}
              
              {/* Narrative Drift */}
              {analysisResult.narrativeDrift && <AuditSectionCard section={analysisResult.narrativeDrift} />}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6">
              <Button
                onClick={() => {
                  setAnalysisResult(null);
                  setPortfolioData("");
                }}
                variant="outline"
              >
                Run Another Audit
              </Button>
              <Button
                onClick={() => navigate("/pipeline")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Go to Pipeline
              </Button>
            </div>
          </div>
        )}
    </PageLayout>
  );
}
