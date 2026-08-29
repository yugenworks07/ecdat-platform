import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight } from "lucide-react";

export function EcdatHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="observatory-page-header sih-demo-page-header flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="sih-demo-header-copy"><div className="observatory-eyebrow sih-demo-header-eyebrow mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em]"><span className="h-1.5 w-1.5 rounded-full" />{eyebrow}</div><h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-white md:text-4xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p></div><div className="sih-demo-header-proof"><Badge variant="outline" className="w-fit gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Evidence-led</Badge></div></div>;
}

export function Breadcrumb({ section }: { section: string }) { return <div className="observatory-breadcrumb sih-demo-breadcrumb mb-5 flex items-center gap-1 text-xs"><span>Mission control</span><ChevronRight className="h-3 w-3" /><span>{section}</span></div>; }
