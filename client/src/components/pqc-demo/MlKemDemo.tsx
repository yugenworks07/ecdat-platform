import { Button } from "@/components/ui/button";
import { runMlKemDemo, type MlKemDemoOutcome } from "@/lib/pqcDemo";
import { KeyRound, LockKeyhole, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function MlKemDemo() {
  const [outcome, setOutcome] = useState<MlKemDemoOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = () => {
    try { setError(null); setOutcome(runMlKemDemo()); }
    catch { setError("The browser could not run the isolated ML-KEM demonstration. Retry in a current browser with secure randomness available."); }
  };
  const stages = outcome ? [
    ["01", "Key generation", `${outcome.publicKeyBytes.toLocaleString()}-byte public key generated locally`],
    ["02", "Encapsulation", `${outcome.ciphertextBytes.toLocaleString()}-byte ciphertext and ${outcome.sharedSecretBytes}-byte secret derived`],
    ["03", "Decapsulation", outcome.sharedSecretMatches ? "Shared secret matched locally" : "Shared secret did not match"],
  ] : [
    ["01", "Key generation", "Generate a local ML-KEM-768 key pair"],
    ["02", "Encapsulation", "Encapsulate to the local public key"],
    ["03", "Decapsulation", "Verify both local participants derive the same secret"],
  ];
  return <DemoPanel eyebrow="FIPS 203 · ML-KEM-768" title="Key-establishment demonstration" description="A local browser demonstration using a vetted implementation. It does not create a network connection, save key material, or represent a production handshake.">
    <div className="grid gap-3 md:grid-cols-3">{stages.map(([index, title, note]) => <div key={index} className="rounded-2xl border border-white/[0.08] bg-[#06101c]/70 p-4"><span className="text-[10px] font-bold tracking-[.2em] text-[#fdc448]">{index}</span><p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-100">{index === "01" ? <KeyRound className="h-4 w-4 text-cyan-100" /> : index === "02" ? <LockKeyhole className="h-4 w-4 text-cyan-100" /> : <ShieldCheck className="h-4 w-4 text-emerald-200" />}{title}</p><p className="mt-2 text-xs leading-5 text-slate-500">{note}</p></div>)}</div>
    <div className="mt-5 flex flex-wrap items-center gap-3"><Button onClick={run} className="bg-[#fc4c1f] text-white hover:bg-[#df3003]"><Play className="h-3.5 w-3.5 fill-current" />Run ML-KEM demonstration</Button>{outcome ? <span className={`inline-flex items-center gap-2 text-xs font-semibold ${outcome.sharedSecretMatches ? "text-emerald-200" : "text-rose-200"}`}><ShieldCheck className="h-4 w-4" />{outcome.sharedSecretMatches ? "Shared secret match confirmed" : "No shared-secret match"}</span> : null}</div>
    {error ? <p role="alert" className="mt-4 text-xs text-rose-200">{error}</p> : null}
  </DemoPanel>;
}

function DemoPanel({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-cyan-200/15 bg-[#091423] p-5 shadow-2xl shadow-black/15 md:p-6"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-100">{eyebrow}</p><h2 className="mt-3 font-display text-2xl font-semibold tracking-[-.035em] text-white">{title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{description}</p><div className="mt-6">{children}</div></section>;
}
