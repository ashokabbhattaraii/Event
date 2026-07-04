"use client"

import { useEffect, useRef, useState } from "react"
import { Sparkles, X, Send, Mic, QrCode } from "lucide-react"
import { ensureGsap, prefersReducedMotion } from "@/lib/gsap"

type Msg = { from: "bot" | "user"; text: string; qr?: boolean }

const seed: Msg[] = [
  { from: "bot", text: "Hi, I'm EventBot. Ask me about events, tickets, or registrations." },
  { from: "user", text: "What events are happening this week?" },
  {
    from: "bot",
    text: "3 events this week: Growth Marketing Live (today), Founder Mixer (Tue), and Cloud Security Day previews. Want to register for any?",
  },
  { from: "user", text: "I need my ticket QR code for DevSummit." },
  { from: "bot", text: "Here's your DevSummit 2026 ticket. Show this at entry:", qr: true },
]

const quickReplies = ["View my tickets", "Find events near me", "Check registration status"]

export function EventBot({ open, onClose }: { open: boolean; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Msg[]>(seed)
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || prefersReducedMotion()) return
    const gsap = ensureGsap()
    const ctx = gsap.context((self) => {
      const q = self.selector!
      gsap.from(panel.current, { x: 60, opacity: 0, duration: 0.5, ease: "power3.out" })
      gsap.from(q(".bot-msg"), { y: 16, opacity: 0, stagger: 0.08, duration: 0.4, delay: 0.15 })
      gsap.to(q(".bot-orb"), { scale: 1.12, duration: 1.4, ease: "sine.inOut", repeat: -1, yoyo: true })
    }, panel)
    return () => ctx.revert()
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  function send(text: string) {
    if (!text.trim()) return
    setMessages((m) => [...m, { from: "user", text }])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        { from: "bot", text: "Got it — here's what I found based on live event data. Anything else?" },
      ])
    }, 1100)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-label="EventBot AI assistant">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div ref={panel} className="relative flex h-full w-full max-w-[420px] flex-col bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="bot-orb bg-brand-gradient flex size-9 items-center justify-center rounded-full text-white">
              <Sparkles className="size-4" />
            </span>
            <div>
              <div className="font-display text-sm font-bold text-ink">EventBot</div>
              <div className="flex items-center gap-1 text-[11px] text-secondary">
                <span className="size-1.5 rounded-full bg-secondary" /> AI Assistant · Online
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
            aria-label="Close chat"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* messages */}
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((m, i) => (
            <div key={i} className={`bot-msg flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.from === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border-l-2 border-secondary bg-muted text-ink"
                }`}
              >
                {m.text}
                {m.qr && (
                  <div className="mt-3 flex items-center gap-3 rounded-xl bg-card p-3">
                    <div className="flex size-16 items-center justify-center rounded-lg bg-ink text-white">
                      <QrCode className="size-10" />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="font-mono font-semibold text-ink">TKT-DS26-0847</div>
                      DevSummit 2026 · Valid
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl bg-muted px-4 py-3">
                {[0, 1, 2].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                    style={{ animationDelay: `${d * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* quick replies */}
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {quickReplies.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted"
            >
              {q}
            </button>
          ))}
        </div>

        {/* input */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-border px-4 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask EventBot anything..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
            aria-label="Voice input"
          >
            <Mic className="size-4" />
          </button>
          <button
            type="submit"
            className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-white"
            aria-label="Send message"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
