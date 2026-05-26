import { FormEvent, useEffect, useRef, useState } from "react";
import { Sparkles, Send, ShieldAlert, Loader2, Info, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ChatMsg = { role: "user" | "assistant"; content: string; blocked?: boolean };

const SUGGESTIONS = [
  "How do I apply for leave?",
  "Explain my payroll components",
  "Tips to prepare for my appraisal",
  "What training programs are available?",
];

export default function AssistantPanel({ userName }: { userName?: string | null }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content: `Hi${userName ? ` ${userName}` : ""}! I'm your HRGreatly AI assistant. Ask me about HR, attendance, leave, payroll, training, appraisals, or any workplace question. I won't answer security-related questions — please contact IT for those.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.reply ?? "(no reply)", blocked: !!data?.blocked },
      ]);
    } catch (e: any) {
      toast.error(e?.message ?? "AI request failed");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-border bg-card p-5 shadow-glow">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight">AI Assistant</h2>
            <p className="text-sm text-muted-foreground">
              Ask anything about HR, work, or productivity. Security topics are off-limits.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning">
            <Info className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              Security questions are blocked for your protection
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              To keep company data safe, I cannot answer questions about passwords, credentials,
              system vulnerabilities, hacking, or internal security settings. Please contact your IT
              or Security team for help with those topics.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                "HR policies",
                "Leave & attendance",
                "Payroll & benefits",
                "Training & growth",
                "Appraisals",
                "Workplace tips",
              ].map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-medium text-success"
                >
                  <CheckCircle2 className="h-3 w-3" /> {topic}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-sm">
        <div
          ref={scrollRef}
          className="max-h-[55vh] min-h-[320px] space-y-3 overflow-y-auto p-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.blocked
                      ? "border border-destructive/30 bg-destructive/10 text-foreground"
                      : "bg-muted text-foreground"
                }`}
              >
                {m.blocked && (
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-destructive">
                    <ShieldAlert className="h-3.5 w-3.5" /> Security topic blocked
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t border-border p-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything about work…"
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 rounded-2xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
