import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  Target,
  RefreshCw,
  FileText,
  Calendar,
  Layers
} from "lucide-react";

interface PortfolioSnapshot {
  name: string;
  date: string;
  holdings: number;
  totalValue: string;
  allocation: {
    equities: number;
    bonds: number;
    other: number;
  };
}

interface RiskScores {
  volatility: number;
  correlation: number;
  collapse: number;
  diversification: number;
}

interface DriftItem {
  ticker: string;
  current: number;
  target: number;
  drift: number;
  action: 'Buy' | 'Sell' | 'Hold';
}

interface RedundancyWarning {
  category: string;
  tickers: string[];
  reason: string;
}

interface ConsolidationSuggestion {
  category: string;
  keep: string;
  sell: string[];
  reason: string;
  savings: string;
}

interface RebalanceAction {
  ticker: string;
  action: 'Buy' | 'Sell';
  amount: string;
  percentage: number;
}

export default function PortfolioOptimizationDashboard() {
  const [, params] = useRoute("/portfolio-optimization/:runId");
  const [, setLocation] = useLocation();
  const [isApplyingRebalance, setIsApplyingRebalance] = useState(false);

  const runId = params?.runId ? parseInt(params.runId) : undefined;

  // Fetch audit data
  const { data: auditData, isLoading, refetch } = trpc.auditor.getReport.useQuery(
    { runId: runId! },
    { enabled: !!runId }
  );

  const applyRebalanceMutation = trpc.auditor.applyRebalanceSuggestions.useMutation({
    onSuccess: () => {
      refetch();
      setIsApplyingRebalance(false);
    },
    onError: () => {
      setIsApplyingRebalance(false);
    }
  });

  const handleApplyRebalance = () => {
    if (!runId) return;
    setIsApplyingRebalance(true);
    applyRebalanceMutation.mutate({ runId });
  };

  if (!runId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No portfolio selected. Please run an audit from the Collapse Auditor first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!auditData) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No audit data found. Please run an audit from the Collapse Auditor first.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Parse audit report to extract dashboard data
  const dashboardData = parseAuditReport(auditData.report || "");

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Portfolio Optimization Dashboard</h1>
        <p className="text-muted-foreground">
          Complete portfolio health analysis with actionable recommendations
        </p>
      </div>

      <div className="space-y-6">
        {/* Portfolio Snapshot */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              <CardTitle>Portfolio Snapshot</CardTitle>
            </div>
            <CardDescription>Overview of your portfolio composition</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Portfolio Name</p>
                <p className="text-lg font-semibold">{dashboardData.snapshot.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Analysis Date</p>
                <p className="text-lg font-semibold">{dashboardData.snapshot.date}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Holdings</p>
                <p className="text-lg font-semibold">{dashboardData.snapshot.holdings}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allocation</p>
                <p className="text-sm">
                  {dashboardData.snapshot.allocation.equities}% Equities • {dashboardData.snapshot.allocation.bonds}% Bonds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Panel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Risk Panel</CardTitle>
            </div>
            <CardDescription>Key risk metrics for your portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <RiskScore 
                label="Volatility" 
                score={dashboardData.riskScores.volatility} 
                description="Price fluctuation intensity"
              />
              <RiskScore 
                label="Correlation" 
                score={dashboardData.riskScores.correlation} 
                description="Holdings move together"
              />
              <RiskScore 
                label="Collapse Risk" 
                score={dashboardData.riskScores.collapse} 
                description="Severe downturn exposure"
              />
              <RiskScore 
                label="Diversification" 
                score={dashboardData.riskScores.diversification} 
                description="Spread across assets"
                inverse
              />
            </div>
          </CardContent>
        </Card>

        {/* Drift Panel */}
        {dashboardData.drift.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <CardTitle>Drift Panel</CardTitle>
              </div>
              <CardDescription>Positions that have drifted from target allocations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.drift.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={item.drift > 0 ? "default" : "secondary"}>
                        {item.ticker}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {item.drift > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {Math.abs(item.drift).toFixed(1)}% {item.drift > 0 ? 'overweight' : 'underweight'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Current: {item.current.toFixed(1)}% • Target: {item.target.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Redundancy Warnings */}
        {dashboardData.redundancy.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Redundancy Warnings</CardTitle>
              </div>
              <CardDescription>Duplicate holdings that provide the same market exposure</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.redundancy.map((warning, idx) => (
                  <Alert key={idx} className="border-orange-200 dark:border-orange-900">
                    <AlertDescription>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-orange-500">
                            {warning.category}
                          </Badge>
                          <span className="text-sm font-medium">
                            {warning.tickers.join(', ')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{warning.reason}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consolidation Suggestions */}
        {dashboardData.consolidation.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
                <CardTitle>Consolidation Suggestions</CardTitle>
              </div>
              <CardDescription>Recommended actions to simplify your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData.consolidation.map((suggestion, idx) => (
                  <div key={idx} className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="default" className="bg-blue-500">
                        {suggestion.category}
                      </Badge>
                      {suggestion.savings && (
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {suggestion.savings}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Keep: <span className="text-green-600 dark:text-green-400">{suggestion.keep}</span>
                        {' • '}
                        Sell: <span className="text-red-600 dark:text-red-400">{suggestion.sell.join(', ')}</span>
                      </p>
                      <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rebalancing Recommendations */}
        {dashboardData.rebalance.length > 0 && (
          <Card className="border-green-200 dark:border-green-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 text-green-500" />
                    <CardTitle>Rebalancing Recommendations</CardTitle>
                  </div>
                  <CardDescription>Suggested trades to restore target allocations</CardDescription>
                </div>
                <Button 
                  onClick={handleApplyRebalance}
                  disabled={isApplyingRebalance}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApplyingRebalance ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>Apply Suggested Rebalance</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.rebalance.map((action, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={action.action === 'Buy' ? 'default' : 'secondary'}>
                        {action.ticker}
                      </Badge>
                      <span className="text-sm font-medium">
                        {action.action} {action.amount}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {action.percentage.toFixed(1)}% adjustment
                    </span>
                  </div>
                ))}
              </div>
              <Alert className="mt-4">
                <AlertDescription className="text-xs">
                  Note: This is a planning tool only. No actual trades will be executed. Review suggestions carefully before implementing.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Optimization Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <CardTitle>Optimization Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {dashboardData.summary}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* History & Timeline */}
        {dashboardData.history && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>History & Timeline</CardTitle>
              </div>
              <CardDescription>Portfolio evolution over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Audit</p>
                    <p className="text-lg font-semibold">{dashboardData.history.lastAudit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Risk Score Trend</p>
                    <p className="text-lg font-semibold">{dashboardData.history.riskTrend}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Changes</p>
                    <p className="text-lg font-semibold">{dashboardData.history.changes}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation('/collapse-auditor')}>
            <FileText className="mr-2 h-4 w-4" />
            Back to Auditor
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}

// Risk Score Component
function RiskScore({ 
  label, 
  score, 
  description, 
  inverse = false 
}: { 
  label: string; 
  score: number; 
  description: string; 
  inverse?: boolean;
}) {
  const getColor = (value: number) => {
    // For inverse scores (like diversification), higher is better
    if (inverse) {
      if (value >= 8) return 'text-green-600 dark:text-green-400';
      if (value >= 5) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-red-600 dark:text-red-400';
    }
    // For normal scores, lower is better
    if (value <= 3) return 'text-green-600 dark:text-green-400';
    if (value <= 6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="space-y-1">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${getColor(score)}`}>{score.toFixed(1)}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Parse audit report to extract dashboard data
function parseAuditReport(report: string) {
  const data = {
    snapshot: {
      name: 'My Portfolio',
      date: new Date().toLocaleDateString(),
      holdings: 0,
      totalValue: '$0',
      allocation: { equities: 0, bonds: 0, other: 0 }
    },
    riskScores: {
      volatility: 5,
      correlation: 5,
      collapse: 5,
      diversification: 5
    },
    drift: [] as DriftItem[],
    redundancy: [] as RedundancyWarning[],
    consolidation: [] as ConsolidationSuggestion[],
    rebalance: [] as RebalanceAction[],
    summary: 'Portfolio analysis complete. Review recommendations above for optimization opportunities.',
    history: null as { lastAudit: string; riskTrend: string; changes: string } | null
  };

  // Parse holdings count (format: "Holdings: 14 positions")
  const holdingsMatch = report.match(/Holdings:\s*(\d+)\s+position/i);
  if (holdingsMatch) {
    data.snapshot.holdings = parseInt(holdingsMatch[1]);
  }

  // Parse allocation percentages (format: "Bonds: 15.6%" and "Equities: 84.4%")
  const bondsMatch = report.match(/Bonds:\s*(\d+(?:\.\d+)?)\s*%/i);
  const equitiesMatch = report.match(/Equities:\s*(\d+(?:\.\d+)?)\s*%/i);
  if (bondsMatch) data.snapshot.allocation.bonds = parseFloat(bondsMatch[1]);
  if (equitiesMatch) data.snapshot.allocation.equities = parseFloat(equitiesMatch[1]);
  data.snapshot.allocation.other = Math.max(0, 100 - data.snapshot.allocation.bonds - data.snapshot.allocation.equities);

  // Parse report date (format: "Report Date: January 15, 2026")
  const dateMatch = report.match(/Report Date:\s*([^\n]+)/i);
  if (dateMatch) {
    data.snapshot.date = dateMatch[1].trim();
  }

  // Parse redundancy warnings (format: "**SECTION 5: REDUNDANCY DETECTION**")
  const redundancySection = report.match(/\*\*SECTION 5: REDUNDANCY DETECTION\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*SECTION|$)/i);
  if (redundancySection) {
    const content = redundancySection[1];
    // Look for redundancy patterns in the content
    const redundancyMatches = content.matchAll(/REDUNDANCY (?:ALERT|DETECTED):\s*([^\n]+)/gi);
    for (const match of redundancyMatches) {
      const description = match[1];
      const tickersMatch = description.match(/([A-Z]{2,5}(?:\s*\([^)]+\))?)\s+(?:and|AND|\+)\s+([A-Z]{2,5}(?:\s*\([^)]+\))?)/);
      if (tickersMatch) {
        const tickers = [tickersMatch[1].match(/[A-Z]{2,5}/)?.[0], tickersMatch[2].match(/[A-Z]{2,5}/)?.[0]].filter(Boolean) as string[];
        data.redundancy.push({
          category: 'Overlap Detected',
          tickers,
          reason: description
        });
      }
    }
  }

  // Parse consolidation suggestions (format: "**SECTION 6: CONSOLIDATION SUGGESTIONS**")
  const consolidationSection = report.match(/\*\*SECTION 6: CONSOLIDATION SUGGESTIONS\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*SECTION|$)/i);
  if (consolidationSection) {
    const content = consolidationSection[1];
    // Look for consolidation patterns
    const suggestions = content.split(/\n\n(?=\d+\.|Category:)/);
    suggestions.forEach(suggestion => {
      const categoryMatch = suggestion.match(/(?:Category:\s*)?([^:\n]+):/);
      const keepMatch = suggestion.match(/(?:Keep|Consolidate into):\s*([A-Z]{2,5})/i);
      const sellMatch = suggestion.match(/(?:Sell|Eliminate|Remove):\s*([A-Z]{2,5}(?:\s*(?:and|,)\s*[A-Z]{2,5})*)/i);
      const savingsMatch = suggestion.match(/(?:Save|Savings):\s*(\$[\d,]+(?:\.\d{2})?[^.\n]*)/i);

      if (categoryMatch && (keepMatch || sellMatch)) {
        const sellTickers = sellMatch ? sellMatch[1].match(/[A-Z]{2,5}/g) || [] : [];
        data.consolidation.push({
          category: categoryMatch[1].trim(),
          keep: keepMatch ? keepMatch[1] : '',
          sell: sellTickers,
          reason: 'Reduce redundancy and lower costs',
          savings: savingsMatch ? savingsMatch[1] : ''
        });
      }
    });
  }

  // Parse risk scores from Quick Metrics section (format: "Overall Risk: 4/10")
  const overallRiskMatch = report.match(/Overall Risk:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (overallRiskMatch) {
    const riskScore = parseFloat(overallRiskMatch[1]);
    // Distribute the overall risk across categories
    data.riskScores.volatility = riskScore;
    data.riskScores.correlation = riskScore;
    data.riskScores.collapse = riskScore;
    data.riskScores.diversification = 10 - riskScore;
  }

  // Parse specific risk scores from sections
  const volatilitySection = report.match(/\*\*SECTION 3: VOLATILITY EXPOSURE\*\*[\s\S]*?Risk Score:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i);
  if (volatilitySection) {
    data.riskScores.volatility = parseFloat(volatilitySection[1]);
  }

  // Don't generate mock drift data - leave it empty since we don't have actual target allocations
  data.drift = [];
  data.rebalance = [];

  // Extract summary from Executive Summary section
  const summarySection = report.match(/\*\*SECTION 1: EXECUTIVE SUMMARY\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*SECTION|$)/i);
  if (summarySection) {
    const summaryText = summarySection[1].trim().split('\n')[0];
    if (summaryText.length > 50) {
      data.summary = summaryText.substring(0, 300) + '...';
    } else {
      data.summary = summaryText;
    }
  }

  // Parse optimization summary from Section 9
  const optimizationSection = report.match(/\*\*SECTION 9: OPTIMIZATION SUMMARY\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*|$)/i);
  if (optimizationSection) {
    const optimizationText = optimizationSection[1].trim();
    if (optimizationText.length > 50) {
      data.summary = optimizationText.substring(0, 400);
    }
  }

  return data;
}
