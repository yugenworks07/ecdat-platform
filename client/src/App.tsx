import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Graph from "./pages/Graph";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Migration from "./pages/Migration";
import NotFound from "./pages/NotFound";
import PqcDashboard from "./pages/PqcDashboard";
import RemediationLab from "./pages/RemediationLab";
import RemediationQueue from "./pages/RemediationQueue";
import Reports from "./pages/Reports";
import { Route, Switch, Router as WouterRouter } from "wouter";

const appBase = import.meta.env.BASE_URL.replace(/\/$/, "");
import { useEffect } from "react";

function LegacyDescentRedirect() {
  useEffect(() => { window.location.replace(`${appBase}/remediation-queue/scan-104`); }, []);
  return <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#1b1b1c] p-6 text-center text-sm text-slate-400">Opening the Remediation Queue…</div>;
}

function LegacyPqcDemoRedirect() {
  useEffect(() => { window.location.replace(`${appBase}/pqc-dashboard`); }, []);
  return <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-[#1b1b1c] p-6 text-center text-sm text-slate-400">Opening the PQC dashboard…</div>;
}

function Router() {
  return <WouterRouter base={appBase}><DashboardLayout><Switch>
    <Route path="/" component={Home} />
    <Route path="/inventory" component={Inventory} />
    <Route path="/graph" component={Graph} />
    <Route path="/migration" component={Migration} />
    <Route path="/pqc-dashboard" component={PqcDashboard} />
    <Route path="/pqc-demo/ml-kem" component={LegacyPqcDemoRedirect} />
    <Route path="/pqc-demo/ml-dsa" component={LegacyPqcDemoRedirect} />
    <Route path="/pqc-demo/hybrid" component={LegacyPqcDemoRedirect} />
    <Route path="/recommendations" component={Migration} />
    <Route path="/roadmap" component={Migration} />
    <Route path="/reports" component={Reports} />
    <Route path="/remediation-queue/:scanId" component={RemediationQueue} />
    <Route path="/remediation-queue" component={RemediationQueue} />
    <Route path="/remediation-lab/:scanId/:findingId" component={RemediationLab} />
    <Route path="/descent" component={LegacyDescentRedirect} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch></DashboardLayout></WouterRouter>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="dark" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
