import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, X, Minus, RotateCcw, Loader2 } from "lucide-react";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

const STORAGE_KEY = "dm-assistant-chat-v1";

const QUICK_PROMPTS = [
  "Start a practice debate",
  "How do I write a stronger rebuttal?",
  "Where can I see my session history?",
  "Tips for cross-examination",
];

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "Hi! I'm your DebateMastery assistant. I can help you with three things:\n\n- **Get around the site** — point you to the right page or section.\n- **Coach you on debate** — arguments, rebuttals, structure, delivery.\n- **Answer general questions** about formats, tournaments, and study habits.\n\nAsk me anything, or pick a starter below.",
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Tiny markdown-ish renderer: bold, bullet lists, links, paragraphs, line breaks. */
function renderRichText(text: string, navigate: (to: string) => void) {
  const lines = text.split("\n");
  const blocks: Array<{ type: "p" | "ul"; items: string[] }> = [];
  let currentList: string[] | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList) {
        currentList = [];
        blocks.push({ type: "ul", items: currentList });
      }
      currentList.push(bulletMatch[1]);
    } else {
      currentList = null;
      blocks.push({ type: "p", items: [line] });
    }
  }

  const renderInline = (s: string, key: string) => {
    // Tokenize: links [text](url), bold **text**
    const out: React.ReactNode[] = [];
    const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(s))) {
      if (m.index > last) out.push(s.slice(last, m.index));
      if (m[1] && m[2]) {
        const href = m[2];
        const label = m[1];
        const isInternal = href.startsWith("/") || href.startsWith("#");
        if (isInternal) {
          out.push(
            <button
              key={`${key}-l-${i++}`}
              type="button"
              onClick={() => navigate(href.startsWith("#") ? `/${href}` : href)}
              data-testid={`link-assistant-${href.replace(/[^a-z0-9]/gi, "-")}`}
              className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
            >
              {label}
            </button>
          );
        } else {
          out.push(
            <a
              key={`${key}-l-${i++}`}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
            >
              {label}
            </a>
          );
        }
      } else if (m[3]) {
        out.push(
          <strong key={`${key}-b-${i++}`} className="font-semibold">
            {m[3]}
          </strong>
        );
      }
      last = m.index + m[0].length;
    }
    if (last < s.length) out.push(s.slice(last));
    return out;
  };

  return blocks.map((b, idx) => {
    if (b.type === "ul") {
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1 my-1">
          {b.items.map((item, j) => (
            <li key={j}>{renderInline(item, `${idx}-${j}`)}</li>
          ))}
        </ul>
      );
    }
    const content = b.items[0] ?? "";
    if (!content.trim()) return <div key={idx} className="h-2" />;
    return (
      <p key={idx} className="leading-relaxed">
        {renderInline(content, `${idx}`)}
      </p>
    );
  });
}

export function AssistantChatbot() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return [GREETING];
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return [GREETING];
  });
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const showQuickPrompts = useMemo(
    () => messages.length === 1 && messages[0].id === "greeting",
    [messages]
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open, streaming]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function sendMessage(text: string, baseline?: ChatMessage[]) {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setError(null);
    const base = baseline ?? messages;
    const userMsg: ChatMessage = { id: uid(), role: "user", content: trimmed };
    const assistantId = uid();
    const placeholder: ChatMessage = { id: assistantId, role: "assistant", content: "" };
    const next = [...base, userMsg, placeholder];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    // Build payload — strip the greeting & empty placeholder
    const payload = {
      messages: next
        .filter((m) => m.id !== "greeting" && m.id !== assistantId)
        .map((m) => ({ role: m.role, content: m.content })),
    };

    try {
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error(`Request failed (${res.status})`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.error) throw new Error(evt.error);
            if (evt.done) continue;
            if (evt.content) {
              setMessages((curr) =>
                curr.map((m) =>
                  m.id === assistantId ? { ...m, content: m.content + evt.content } : m
                )
              );
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (e instanceof Error && e.name === "AbortError") return;
      setError("Something went wrong. Please try again.");
      setMessages((curr) => curr.filter((m) => m.id !== assistantId));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function retryLast() {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const idx = messages.findIndex((m) => m.id === lastUser.id);
    const trimmed = messages.slice(0, idx);
    setMessages(trimmed);
    sendMessage(lastUser.content, trimmed);
  }

  function resetChat() {
    abortRef.current?.abort();
    setMessages([GREETING]);
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Launcher */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            data-testid="button-assistant-launcher"
            aria-label="Open AI assistant"
            className="fixed bottom-5 left-5 z-[55] flex items-center gap-2 px-4 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-colors"
          >
            <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-white/15">
              <Bot className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-primary" />
            </span>
            <span className="hidden sm:inline font-medium pr-1">Ask the Coach</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-[55] bottom-0 left-0 right-0 sm:bottom-5 sm:left-5 sm:right-auto"
            data-testid="panel-assistant"
            role="dialog"
            aria-label="AI assistant chat"
          >
            <div className="flex flex-col w-full sm:w-[380px] h-[80vh] sm:h-[560px] max-h-[calc(100vh-2rem)] bg-card border border-border sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-primary text-primary-foreground">
                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-tight">Coach Assistant</p>
                  <p className="text-xs text-white/70 leading-tight flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Site guide & debate coach
                  </p>
                </div>
                <button
                  onClick={resetChat}
                  className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                  aria-label="Reset conversation"
                  data-testid="button-assistant-reset"
                  title="Start over"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                  aria-label="Minimize"
                  data-testid="button-assistant-minimize"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-md hover:bg-white/15 transition-colors"
                  aria-label="Close"
                  data-testid="button-assistant-close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background"
                data-testid="list-assistant-messages"
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    data-testid={`message-${m.role}-${m.id}`}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm border border-border/60"
                      }`}
                    >
                      {m.role === "assistant" ? (
                        m.content ? (
                          <div className="space-y-1">{renderRichText(m.content, navigate)}</div>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Thinking…
                          </span>
                        )
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}

                {error && (
                  <div
                    className="flex items-center justify-between gap-2 text-xs bg-destructive/10 text-destructive border border-destructive/30 rounded-lg px-3 py-2"
                    data-testid="text-assistant-error"
                  >
                    <span>{error}</span>
                    <button
                      onClick={retryLast}
                      className="font-semibold underline hover:no-underline"
                      data-testid="button-assistant-retry"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {showQuickPrompts && (
                  <div className="pt-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                      Try asking
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PROMPTS.map((p, i) => (
                        <button
                          key={p}
                          onClick={() => sendMessage(p)}
                          data-testid={`button-assistant-suggestion-${i}`}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted hover:border-accent/50 transition-colors text-foreground/80 hover:text-foreground"
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border bg-card p-3">
                <div className="flex items-end gap-2 rounded-xl border border-border bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all px-3 py-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Ask about debate, the site, or your next move…"
                    data-testid="input-assistant-message"
                    className="flex-1 resize-none bg-transparent outline-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground max-h-32"
                    style={{ minHeight: "1.4rem" }}
                    disabled={streaming}
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || streaming}
                    data-testid="button-assistant-send"
                    aria-label="Send message"
                    className="shrink-0 w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {streaming ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                  AI can make mistakes. Verify important info.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
