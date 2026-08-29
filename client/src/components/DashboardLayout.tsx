import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useTheme } from "@/contexts/ThemeContext";
import { useActiveEcdatScan } from "@/hooks/useActiveEcdatScan";
import { buildGlobalSearchItems } from "@/lib/globalSearch";
import { Bell, Compass, FileText, FlaskConical, GitBranch, LayoutDashboard, LogOut, Moon, Route, ScanSearch, Search, ShieldAlert, ShieldCheck, Sun } from "lucide-react";
import { remediationQueueUrl } from "@/lib/labLaunch";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "Command center", path: "/" },
  { icon: ScanSearch, label: "CBOM inventory", path: "/inventory" },
  { icon: GitBranch, label: "Dependency graph", path: "/graph" },
  { icon: Route, label: "Migration", path: "/migration" },
  { icon: ShieldCheck, label: "PQC dashboard", path: "/pqc-dashboard" },
  { icon: FileText, label: "Evidence & Reports", path: "/reports" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const workspace = useActiveEcdatScan();
  const [location, setLocation] = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const searchItems = useMemo(() => buildGlobalSearchItems(workspace.findings, workspace.recommendations), [workspace.findings, workspace.recommendations]);
  const notifications = useMemo(() => workspace.findings.filter(finding => finding.hndlExposure || finding.riskLevel === "Critical").slice(0, 4), [workspace.findings]);
  const baseLocation = location.split("?")[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("qaCommand") === "1") setSearchOpen(true);
  }, []);

  useEffect(() => {
    const qaReducedMotion = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qaReduced") === "1";
    const reducedMotion = qaReducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hasInitialized = sessionStorage.getItem("ecdat-workspace-initialized") === "1";
    const qaBootPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("qaBoot") === "1";
    const timer = window.setTimeout(() => {
      sessionStorage.setItem("ecdat-workspace-initialized", "1");
      setInitializing(false);
    }, qaBootPreview && !reducedMotion && !hasInitialized ? 2200 : reducedMotion || hasInitialized ? 0 : 520);
    return () => window.clearTimeout(timer);
  }, []);

  const navigate = (path: string) => {
    setLocation(path);
    setSearchOpen(false);
    setNotificationOpen(false);
  };

  const openRemediationQueue = () => navigate(remediationQueueUrl(workspace.scanKey));

  return <SidebarProvider defaultOpen>
    <Sidebar collapsible="icon" className="sih-demo-sidebar border-r text-slate-100">
      <SidebarHeader className="sih-demo-sidebar-header">
        <button onClick={() => navigate("/")} className="sih-demo-brand" aria-label="Go to ECDAT Command Center">
          <span className="sih-demo-brand-mark"><Compass className="h-5 w-5" strokeWidth={2.7} /></span>
          <span className="group-data-[collapsible=icon]:hidden"><span className="sih-demo-brand-name">ECDAT</span><span className="sih-demo-brand-subtitle">Cryptographic intelligence</span></span>
        </button>
      </SidebarHeader>
      <SidebarContent className="sih-demo-sidebar-content">
        <div className="sih-demo-mission group-data-[collapsible=icon]:hidden"><span className="sih-demo-eyebrow">Active workspace</span><strong>Crypto assurance<br />mission control</strong><span>DISCOVER · ASSESS · MIGRATE</span></div>
        <div className="sih-demo-nav-title group-data-[collapsible=icon]:hidden">Evidence workspaces</div>
        <Button onClick={() => setSearchOpen(true)} variant="outline" className="sih-demo-search mb-4 w-full justify-start group-data-[collapsible=icon]:justify-center" aria-label="Search workspace"><Search className="h-4 w-4 shrink-0" /><span className="group-data-[collapsible=icon]:hidden">Search evidence</span><kbd className="ml-auto rounded border px-1.5 py-0.5 text-[10px] group-data-[collapsible=icon]:hidden">⌘K</kbd></Button>
        <SidebarMenu className="sih-demo-nav">{menuItems.map((item, index) => <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={baseLocation === item.path} onClick={() => navigate(item.path)} tooltip={item.label} className="sih-demo-nav-item"><span className="sih-demo-nav-index group-data-[collapsible=icon]:hidden">{String(index + 1).padStart(2, "0")}</span><item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu>
        <div className="sih-demo-sidebar-rule" />
        <SidebarMenu><SidebarMenuItem><SidebarMenuButton onClick={openRemediationQueue} tooltip="Open Remediation Queue" className="sih-demo-queue-link"><FlaskConical className="h-4 w-4 shrink-0" /><span>Remediation Queue</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="sih-demo-sidebar-footer">
        <div className="flex gap-2"><Button onClick={toggleTheme} variant="outline" className="sih-demo-theme flex-1 group-data-[collapsible=icon]:justify-center" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}<span className="group-data-[collapsible=icon]:hidden">{theme === "dark" ? "Light theme" : "Dark theme"}</span></Button><Button onClick={() => setNotificationOpen(true)} variant="outline" size="icon" className="sih-demo-icon-button relative" aria-label="Open active risk notifications"><Bell className="h-4 w-4" />{notifications.length ? <span className="sih-demo-notification-count">{notifications.length}</span> : null}</Button></div>
        <div className="sih-demo-account">{loading ? <div className="h-9 animate-pulse rounded-md bg-white/5" /> : user ? <><Avatar className="h-8 w-8 border border-[#fdc448]/40"><AvatarFallback className="bg-[#fc4c1f] text-xs font-bold text-white">{user.name?.slice(0, 1).toUpperCase() ?? "E"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-xs font-semibold text-white">{user.name ?? "ECDAT user"}</p><p className="truncate text-[10px] uppercase tracking-[.12em] text-slate-500">Protected history</p></div><button onClick={logout} className="text-slate-500 transition hover:text-white group-data-[collapsible=icon]:hidden" aria-label="Sign out"><LogOut className="h-4 w-4" /></button></> : <Button onClick={() => startLogin()} variant="outline" className="sih-demo-signin w-full group-data-[collapsible=icon]:justify-center"><ShieldCheck className="h-4 w-4" /><span className="group-data-[collapsible=icon]:hidden">Sign in to save</span></Button>}</div>
      </SidebarFooter>
    </Sidebar>
    <SidebarInset className="min-h-screen bg-[#060606] text-slate-100">
      <header className="sih-demo-mobile-header sticky top-0 z-30 flex h-16 items-center justify-between px-3 md:hidden"><div className="flex items-center gap-3"><SidebarTrigger /><span className="font-display text-sm font-bold tracking-[.08em]">ECDAT</span></div><div className="flex items-center gap-2"><Button onClick={() => setSearchOpen(true)} variant="outline" size="icon" className="sih-demo-icon-button h-9 w-9" aria-label="Search workspace"><Search className="h-3.5 w-3.5" /></Button><Button onClick={toggleTheme} variant="outline" size="icon" className="sih-demo-theme h-9 w-9 p-0" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}</Button></div></header>
      <main className="sih-demo-main min-h-screen p-4 md:p-7 lg:p-9">{children}</main>
    </SidebarInset>
    <CommandDialog open={searchOpen} onOpenChange={setSearchOpen} title="Search ECDAT workspace" description="Search routes, observed scan evidence, and generated guidance." className="sih-demo-dialog sih-demo-command-dialog max-w-2xl text-slate-100"><CommandInput placeholder="Search routes, evidence, or PQC guidance…" /><CommandList><CommandEmpty className="text-slate-500">No workspace result found.</CommandEmpty>{(["Navigate", "Observed evidence", "Generated guidance"] as const).map(group => { const items = searchItems.filter(item => item.group === group); return items.length ? <CommandGroup key={group} heading={group}>{items.map(item => <CommandItem key={`${item.group}-${item.path}-${item.label}`} value={item.value} onSelect={() => navigate(item.path)} className="items-start py-3.5 text-slate-300 data-[selected=true]:bg-[#fc4c1f]/15 data-[selected=true]:text-white"><Search className="mt-0.5 h-3.5 w-3.5 text-[#fdc448]" /><span className="min-w-0"><span className="block truncate text-xs font-medium">{item.label}</span><span className="mt-0.5 block truncate text-[10px] text-slate-500">{item.detail}</span></span>{item.group === "Navigate" ? <CommandShortcut className="shrink-0 self-center">GO</CommandShortcut> : null}</CommandItem>)}</CommandGroup> : null; })}</CommandList></CommandDialog>
    <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}><DialogContent className="sih-demo-dialog max-w-md text-slate-100"><DialogHeader><DialogTitle className="flex items-center gap-2"><Bell className="h-4 w-4 text-[#fdc448]" />Active risk signals</DialogTitle><DialogDescription className="text-slate-500">Derived from the current scan’s critical or HNDL-qualified findings.</DialogDescription></DialogHeader><div className="space-y-2">{notifications.length ? notifications.map(finding => <button type="button" key={finding.findingKey} onClick={() => navigate(`/inventory?finding=${encodeURIComponent(finding.findingKey)}`)} className="sih-demo-notification-row"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#ff0003]" /><span><span className="block text-sm font-medium text-slate-100">{finding.assetName}</span><span className="mt-1 block text-xs text-slate-500">{finding.algorithm} · {finding.riskLevel} risk{finding.hndlExposure ? " · potential HNDL" : ""}</span></span></button>) : <p className="rounded-md border border-white/8 bg-white/[0.025] p-4 text-sm text-slate-500">No critical or HNDL-qualified signals are present in the active scan.</p>}</div></DialogContent></Dialog>
    {initializing ? <div aria-hidden="true" className="sih-demo-boot pointer-events-none fixed inset-0 z-[80] grid place-items-center"><div className="flex flex-col items-center"><span className="sih-demo-boot-mark"><Compass className="h-7 w-7" /></span><p className="mt-5 font-display text-xl font-bold tracking-[.18em] text-white">ECDAT</p><p className="mt-2 text-[10px] font-bold uppercase tracking-[.26em] text-[#fdc448]">Cryptographic intelligence workspace</p><span className="sih-demo-boot-line"><span /></span><p className="mt-3 text-[11px] text-slate-500">Establishing the evidence command deck</p></div></div> : null}
  </SidebarProvider>;
}
