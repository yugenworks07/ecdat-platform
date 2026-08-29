import { AIChatBox, type Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { BotMessageSquare } from "lucide-react";
import { useState } from "react";

export function CopilotPanel({ scanKey, onFocusFinding }: { scanKey: string; onFocusFinding?: (findingKey: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const chat = trpc.ecdat.chat.useMutation();

  const sendMessage = (content: string) => {
    const userMessage: Message = { role: "user", content };
    const conversation = [...messages, userMessage].map(message => ({ role: message.role as "user" | "assistant", content: message.content }));
    setMessages(previous => [...previous, userMessage]);
    chat.mutate({ scanKey, messages: conversation }, {
      onSuccess: response => {
        setMessages(previous => [...previous, { role: "assistant", content: response.content }]);
        if (response.focusFindingKey) onFocusFinding?.(response.focusFindingKey);
      },
      onError: () => setMessages(previous => [...previous, { role: "assistant", content: "I could not generate a scan-grounded response right now. Your active scan and evidence were not changed." }]),
    });
  };

  return <section className="border-t border-white/[0.07] p-5" aria-label="AI Crypto Analyst">
    <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-violet-200/15 bg-violet-300/[0.08] text-violet-100"><BotMessageSquare className="h-4 w-4" /></span><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-200/70">AI Crypto Analyst</p><p className="mt-1 text-xs leading-5 text-slate-500">Uses this saved scan’s observed evidence and planning inputs. Generated guidance is not a security finding or certainty.</p></div></div>
    <AIChatBox messages={messages} onSendMessage={sendMessage} isLoading={chat.isPending} height="420px" className="mt-4 overflow-hidden border-white/[0.08] bg-[#0a1121]" placeholder="Ask about this saved scan…" emptyStateMessage="Ask about observed risk, relationships, or migration paths." suggestedPrompts={["Which observed assets are most at risk?", "What is the migration path for the selected finding?", "Explain the observed dependency path.", "What potential HNDL signals should I prioritise?"]} />
  </section>;
}
