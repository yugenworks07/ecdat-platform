import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import RemediationQueue from "@/pages/RemediationQueue";
import { COOKIE_NAME } from "@shared/const";
import superjson from "superjson";
import "../index.css";

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [httpBatchLink({
    url: "/api/trpc",
    transformer: superjson,
    headers() {
      try {
        const raw = sessionStorage.getItem("manus-cookie");
        const prefix = `${COOKIE_NAME}=`;
        const pair = raw?.split(";").find((item) => item.trim().startsWith(prefix));
        const token = pair?.trim().slice(prefix.length);
        return token ? { Authorization: `Bearer ${token}` } : {};
      } catch {
        return {};
      }
    },
    fetch(input, init) {
      return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
    },
  })],
});

export function QueueApp() {
  const params = new URLSearchParams(window.location.search);
  const scanId = params.get("scanId") ?? "scan-104";

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark">
          <TooltipProvider>
            <Toaster />
            <main className="min-h-screen bg-[#06101c] px-4 py-5 text-slate-100 md:px-7 md:py-8">
              <RemediationQueue />
            </main>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
