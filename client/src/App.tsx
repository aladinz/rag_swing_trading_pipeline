import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TopNavigation } from "./components/Navigation";
import Home from "./pages/Home";
import PipelineDashboard from "./pages/PipelineDashboard";
import CollapseAuditor from "./pages/CollapseAuditor";
import PipelineSummary from "./pages/PipelineSummary";
import DailyRitual from "./pages/DailyRitual";

function Router() {
  return (
    <main className="pt-16">
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/pipeline"} component={PipelineDashboard} />
        <Route path={"/auditor"} component={CollapseAuditor} />
        <Route path={"/daily-ritual"} component={DailyRitual} />
        <Route path={"/summary/:runId"} component={PipelineSummary} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </main>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <TopNavigation />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
