import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCheck, ShieldCheck, UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReviewRole = "securityLead" | "platformEngineer" | "compliance";

type Reviewer = {
  id: ReviewRole;
  label: string;
  required: boolean;
  description: string;
};

const reviewers: Reviewer[] = [
  {
    id: "securityLead",
    label: "Security lead approval",
    required: true,
    description: "Confirms the target posture, exposure assumptions, and risk treatment.",
  },
  {
    id: "platformEngineer",
    label: "Platform engineer approval",
    required: true,
    description: "Confirms the proposed path is compatible with the delivery environment.",
  },
  {
    id: "compliance",
    label: "Compliance sign-off",
    required: false,
    description: "Optional review for policy, regulatory, or audit requirements.",
  },
];

export type ApprovalState = Record<ReviewRole, boolean>;

export function approvalProgress(approvals: ApprovalState) {
  const required = reviewers.filter((reviewer) => reviewer.required);
  const received = required.filter((reviewer) => approvals[reviewer.id]).length;
  return { received, required: required.length, complete: received === required.length };
}

export function RemediationLab({ onRequiredApprovalsChange }: { onRequiredApprovalsChange?: (complete: boolean) => void }) {
  const [approvals, setApprovals] = useState<ApprovalState>({
    securityLead: false,
    platformEngineer: false,
    compliance: false,
  });
  const progress = useMemo(() => approvalProgress(approvals), [approvals]);

  useEffect(() => { onRequiredApprovalsChange?.(progress.complete); }, [onRequiredApprovalsChange, progress.complete]);

  const assignReviewer = (role: ReviewRole) => {
    setApprovals((current) => ({ ...current, [role]: true }));
  };

  return (
    <section
      aria-labelledby="review-approvals-title"
      className="rounded-3xl border border-white/[0.08] bg-[#081321] p-5 shadow-[0_22px_55px_rgba(0,0,0,0.16)] md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-100">
            <ClipboardCheck className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/70">Governance checkpoint</p>
          </div>
          <h2 id="review-approvals-title" className="mt-2 font-display text-xl font-semibold text-white">Review Approvals</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">Assign accountable reviewers before progressing this simulated change to a validated delivery process.</p>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${progress.complete ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"}`}>
          {progress.complete ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRoundCheck className="h-3.5 w-3.5" />}
          {progress.complete ? "Required reviews complete" : "Reviewers pending"}
        </span>
      </div>

      <div className="mt-6 space-y-6">
        <ReviewGroup title="Required approvals" items={reviewers.filter((reviewer) => reviewer.required)} approvals={approvals} onAssign={assignReviewer} />
        <ReviewGroup title="Optional approvals" items={reviewers.filter((reviewer) => !reviewer.required)} approvals={approvals} onAssign={assignReviewer} />
      </div>

      <div className="mt-6 border-t border-white/[0.08] pt-5">
        <p aria-live="polite" className="text-sm font-medium text-slate-200">Status: <span className={progress.complete ? "text-emerald-100" : "text-cyan-100"}>{progress.received} / {progress.required} required approvals received</span></p>
        <p className="mt-3 rounded-xl border border-cyan-200/10 bg-cyan-300/[0.04] px-3 py-2.5 text-xs leading-5 text-slate-400">In demo mode, selecting <strong className="font-semibold text-slate-200">Assign reviewer</strong> auto-assigns and auto-approves that reviewer. This is browser-local simulation state and does not create a real approval record.</p>
      </div>
    </section>
  );
}

function ReviewGroup({
  title,
  items,
  approvals,
  onAssign,
}: {
  title: string;
  items: Reviewer[];
  approvals: ApprovalState;
  onAssign: (role: ReviewRole) => void;
}) {
  return (
    <div>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">
        {items.map((reviewer) => {
          const approved = approvals[reviewer.id];
          return (
            <div key={reviewer.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span aria-hidden="true" className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${approved ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-100" : "border-slate-500/70 bg-transparent"}`}>
                  {approved ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </span>
                <span>
                  <span className="block text-sm font-medium text-slate-100">{reviewer.label}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{approved ? "Auto-approved in demo mode" : reviewer.description}</span>
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant={approved ? "outline" : "default"}
                disabled={approved}
                onClick={() => onAssign(reviewer.id)}
                className={approved ? "border-emerald-200/20 bg-emerald-300/[0.06] text-emerald-100" : "bg-cyan-200 text-[#072033] hover:bg-cyan-100"}
              >
                {approved ? "Approved" : "Assign reviewer"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
