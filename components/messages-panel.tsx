"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, CheckCheck, Send } from "lucide-react";
import { messagesApi, type RequestMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/constants";
import { ErrorNote } from "@/components/modal";

const POLL_MS = 20_000;

/** Conversation with the team about one request. Opening it marks the team's messages as read. */
export function MessagesPanel({ reference }: { reference: string }) {
  const [messages, setMessages] = useState<RequestMessage[] | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      setMessages((await messagesApi.get(reference)).messages);
    } catch (e) {
      setError((cur) => cur || (e instanceof Error ? e.message : "Could not load messages."));
    }
  }, [reference]);

  useEffect(() => {
    load();
    const refresh = () => document.visibilityState === "visible" && load();
    const timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  // Keep the newest message in view, but only when something new arrives.
  useEffect(() => {
    const n = messages?.length ?? 0;
    if (n > lastCount.current && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    lastCount.current = n;
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    setError("");
    try {
      setMessages((await messagesApi.post(reference, body)).messages);
      setText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold">Messages</h3>
      <p className="text-xs text-slate-500">Visible to the team. They are emailed when you write.</p>

      {!messages && !error ? (
        <p className="mt-4 text-sm text-slate-500" aria-busy="true">Loading…</p>
      ) : messages && messages.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-500">No messages yet.</p>
      ) : (
        <ul ref={listRef} className="mt-4 max-h-96 space-y-3 overflow-y-auto pr-1" aria-live="polite">
          {messages?.map((m) => (
            <li key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.mine ? "bg-[#007cc2] text-white" : "bg-[#f4f7f8] text-[#102331]"}`}>
                <p className={`text-xs font-semibold ${m.mine ? "text-white/80" : "text-slate-500"}`}>
                  {m.mine ? "You" : m.senderName}
                </p>
                <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${m.mine ? "text-white/70" : "text-slate-400"}`}>
                  {formatDateTime(m.createdAt)}
                  {m.mine && (m.read ? <CheckCheck className="size-3.5" aria-label="Read" /> : <Check className="size-3.5" aria-label="Sent" />)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={send} className="mt-4 space-y-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(e);
          }}
          rows={3}
          maxLength={2000}
          placeholder="Write to the team… (Ctrl+Enter to send)"
          aria-label="Message to the team"
          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#007cc2] focus:ring-2 focus:ring-[#007cc2]/20"
        />
        <ErrorNote message={error} />
        <div className="flex justify-end">
          <button
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#007cc2] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#006ba8] disabled:opacity-60"
          >
            <Send className="size-4" /> {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
