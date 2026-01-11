import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, TrendingUp, TrendingDown, Calendar, Lightbulb } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/PageLayout";

const features = [
  {
    icon: TrendingDown,
    title: "Collapse Auditor",
    description: "Analyze portfolio risk and collapse potential with AI-powered risk scoring",
    href: "/auditor",
    color: "from-red-500 to-orange-500",
  },
  {
    icon: BarChart3,
    title: "Pipeline Dashboard",
    description: "Monitor trading signals and pipeline stages in real-time",
    href: "/pipeline",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Calendar,
    title: "Daily Ritual",
    description: "Run your daily trading ritual and analysis workflows",
    href: "/daily-ritual",
    color: "from-purple-500 to-pink-500",
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-center">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-6 flex justify-center">
              <div className="p-3 bg-blue-600/20 rounded-full">
                <TrendingUp className="w-12 h-12 text-blue-400" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-6">RAG Swing-Trading Pipeline</h1>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              An intelligent, multi-stage trading decision system powered by AI analysis and risk auditing. Make smarter trading decisions with real-time portfolio analysis.
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6">
                Sign In to Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageLayout
      title={`Welcome, ${user?.name}`}
      subtitle="Your AI-powered swing trading analysis platform"
    >
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Platform Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Active
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Last Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Portfolio Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-sm font-medium">
              <Lightbulb className="w-3 h-3" />
              Good
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.href}
              className="group hover:shadow-lg transition-all cursor-pointer border-l-4 border-transparent hover:border-blue-500"
              onClick={() => navigate(feature.href)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${feature.color} text-white group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {feature.title}
                </CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="ghost"
                  className="w-full justify-between group/btn"
                  onClick={() => navigate(feature.href)}
                >
                  <span>Open</span>
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-8 border border-blue-200 dark:border-blue-900/50">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Ready to analyze your portfolio?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Start with a portfolio collapse audit to understand your risk exposure, then monitor your trading pipeline in real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => navigate("/auditor")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Run Collapse Audit
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              onClick={() => navigate("/pipeline")}
              variant="outline"
            >
              View Pipeline
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
