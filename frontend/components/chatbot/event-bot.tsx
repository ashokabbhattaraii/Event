"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Plus, Sparkles, X, Send, MessageCircle, ChevronDown, Trash2, Eraser } from "lucide-react"
import { ensureGsap, prefersReducedMotion } from "@/lib/gsap"
import { chatbotApi } from "@/lib/api/chatbot"
import { EventWizard } from "@/components/chatbot/event-wizard"
import {
  useChatbotStore,
  type ChatConversation,
  type ChatMsg,
} from "@/lib/stores/chatbot-store"

// Renders bot replies as markdown: bold, lists, tables and clickable event
// links. Internal links (/events/...) use Next Link so navigation keeps the
// SPA shell; anything external opens in a new tab.
const markdownComponents = {
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (!href) return <span>{children}</span>
    if (href.startsWith("/")) {
      return (
        <Link href={href} className="font-medium text-primary underline underline-offset-2 hover:opacity-80">
          {children}
        </Link>
      )
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2 hover:opacity-80">
        {children}
      </a>
    )
  },
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-1.5 max-w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/70 text-secondary">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-b border-border px-2.5 py-1.5 font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-b border-border/60 px-2.5 py-1.5 align-top last:border-b-0">{children}</td>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-ink">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="text-muted-foreground">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="my-1 list-disc space-y-0.5 pl-4">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="my-1 list-decimal space-y-0.5 pl-4">{children}</ol>,
}

function BotBubble({ text }: { text: string }) {
  return (
    <div className="bot-msg flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-md border-l-2 border-secondary bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-ink">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {text}
        </ReactMarkdown>
      </div>
    </div>
  )
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="bot-msg flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed text-primary-foreground">
        {text}
      </div>
    </div>
  )
}

const timeAgo = (ts: number) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

// Header dropdown listing every saved conversation — the "advanced chat
// history": switch between past chats, start a new one, delete old ones or
// wipe the current conversation. Everything lives in the zustand store
// (persisted), so it all survives page navigation and reloads.
function ConversationMenu() {
  const [open, setOpen] = useState(false)
  const conversations = useChatbotStore((s) => s.conversations)
  const activeId = useChatbotStore((s) => s.activeId)
  const switchConversation = useChatbotStore((s) => s.switchConversation)
  const startNewConversation = useChatbotStore((s) => s.startNewConversation)
  const deleteConversation = useChatbotStore((s) => s.deleteConversation)
  const clearActiveConversation = useChatbotStore((s) => s.clearActiveConversation)

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt)
  const active = conversations.find((c) => c.id === activeId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat history"
        className="group flex items-center gap-1 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted"
      >
        <div className="text-left">
          <div className="max-w-[150px] truncate font-display text-sm font-bold text-ink">
            {active?.title || "EventBot"}
          </div>
          <div className="text-[10px] text-muted-foreground">{conversations.length} conversation{conversations.length === 1 ? "" : "s"}</div>
        </div>
        <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <button
            onClick={() => {
              startNewConversation()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 border-b border-border px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-muted/60"
          >
            <Plus className="size-4" /> New chat
          </button>

          <div className="max-h-52 overflow-y-auto">
            {sorted.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-1 border-b border-border/60 last:border-b-0 ${
                  c.id === activeId ? "bg-primary/5" : ""
                }`}
              >
                <button
                  onClick={() => {
                    switchConversation(c.id)
                    setOpen(false)
                  }}
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <span className="truncate text-sm font-medium text-ink">{c.title}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(c.updatedAt)}</span>
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  aria-label={`Delete ${c.title}`}
                  className="mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {active && active.messages.length > 1 && (
            <button
              onClick={() => {
                clearActiveConversation()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-ink"
            >
              <Eraser className="size-4" /> Clear current chat
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function EventBot({
  eventId,
}: {
  // The event currently open (from AppShell reading the route), if any —
  // lets event-specific questions (capacity, venue, schedule, price,
  // registration status) resolve instead of always asking "which event?".
  eventId?: string
}) {
  const panel = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  // Pixel override for the panel — null falls back to the CSS defaults
  // (h-[min(620px,...)] w-[min(400px,...)]). w/h are split so one axis can
  // be dragged without touching the other.
  const [size, setSize] = useState<{ w: number | null; h: number | null }>({ w: null, h: null })
  const [resizing, setResizing] = useState<"w" | "h" | null>(null)

  const open = useChatbotStore((s) => s.open)
  const setOpen = useChatbotStore((s) => s.setOpen)
  const input = useChatbotStore((s) => s.input)
  const setInput = useChatbotStore((s) => s.setInput)
  const typing = useChatbotStore((s) => s.typing)
  const conversations = useChatbotStore((s) => s.conversations)
  const activeId = useChatbotStore((s) => s.activeId)
  const suggestions = useChatbotStore((s) => s.suggestions)
  const setSuggestions = useChatbotStore((s) => s.setSuggestions)
  const suggestionsFetched = useChatbotStore((s) => s.suggestionsFetched)
  const setSuggestionsFetched = useChatbotStore((s) => s.setSuggestionsFetched)
  const aiStatus = useChatbotStore((s) => s.aiStatus)
  const setAiStatus = useChatbotStore((s) => s.setAiStatus)
  const send = useChatbotStore((s) => s.send)

  const activeConversation: ChatConversation | undefined = conversations.find((c) => c.id === activeId)
  const messages: ChatMsg[] = activeConversation?.messages ?? []

  useEffect(() => {
    if (!open || prefersReducedMotion()) return
    const gsap = ensureGsap()
    const ctx = gsap.context((self) => {
      const q = self.selector!
      gsap.from(panel.current, { y: 24, scale: 0.96, opacity: 0, duration: 0.35, ease: "power3.out" })
      gsap.from(q(".bot-msg"), { y: 12, opacity: 0, stagger: 0.06, duration: 0.3, delay: 0.1 })
      gsap.to(q(".bot-orb"), { scale: 1.12, duration: 1.4, ease: "sine.inOut", repeat: -1, yoyo: true })
    }, panel)
    return () => ctx.revert()
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing, open])

  // Live AI model status (attendance / CF / intent) from the backend —
  // surfaces whether the trained Python models are serving or the app is in
  // deterministic fallback mode.
  useEffect(() => {
    if (!open || aiStatus !== null) return
    chatbotApi
      .health()
      .then(setAiStatus)
      .catch(() => setAiStatus({ online: false, attendance: false, cf: false, intent: false }))
  }, [open, aiStatus, setAiStatus])

  // Fetch personalized suggestion chips once per app session when the chat
  // first opens; static fallback covers offline / serverless failures.
  useEffect(() => {
    if (!open || suggestionsFetched) return
    setSuggestionsFetched(true)
    chatbotApi
      .suggestions()
      .then(({ suggestions: s }) => {
        if (s?.length) setSuggestions(s)
      })
      .catch(() => {})
  }, [open, suggestionsFetched, setSuggestions, setSuggestionsFetched])

  // Drag a panel edge to resize. The chat is anchored bottom-right, so the
  // free edges are left (width) and top (height). Bounds: usable minimum,
  // and the viewport minus the fixed 24px offsets (bottom-6/right-6) with
  // 24px of top clearance. Pointer events on window keep the drag smooth
  // even when the cursor outruns the handle.
  const startResize = (axis: "w" | "h") => (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = panel.current
    if (!el) return
    const startX = e.clientX
    const startY = e.clientY
    const startW = el.offsetWidth
    const startH = el.offsetHeight
    const minW = 280
    const minH = 300
    const maxW = Math.max(minW, window.innerWidth - 32)
    const maxH = Math.max(minH, window.innerHeight - 48)

    setResizing(axis)
    document.body.style.cursor = axis === "w" ? "ew-resize" : "ns-resize"
    document.body.style.userSelect = "none"

    const onMove = (ev: PointerEvent) => {
      if (axis === "w") {
        const w = Math.min(maxW, Math.max(minW, startW + (startX - ev.clientX)))
        setSize((s) => ({ ...s, w }))
      } else {
        const h = Math.min(maxH, Math.max(minH, startH + (startY - ev.clientY)))
        setSize((s) => ({ ...s, h }))
      }
    }
    const onUp = () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      setResizing(null)
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
  }

  const handleSend = useCallback(() => {
    if (!input.trim() || typing) return
    send(input, eventId)
  }, [input, typing, send, eventId])

  return (
    <>
      {/* Floating action button — hidden while the panel is open */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="bg-brand-gradient fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full text-white shadow-[0_12px_30px_-8px_rgba(91,76,245,0.6)] transition-transform hover:scale-105 active:scale-95"
          aria-label="Open EventBot AI assistant"
        >
          <MessageCircle className="size-6" />
        </button>
      )}

      {/* Floating chat window — bottom-right, no full-screen overlay */}
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-label="EventBot AI assistant"
          aria-modal="true"
          className={`group fixed bottom-6 right-6 z-50 flex h-[min(620px,calc(100dvh-3rem))] w-[min(400px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${resizing ? "select-none" : ""}`}
          style={{ width: size.w ?? undefined, height: size.h ?? undefined }}
        >
          {/* Resize handles — left edge drags width, top edge drags height
              (bottom and right are the fixed anchors). */}
          <div
            onPointerDown={startResize("w")}
            aria-hidden
            className={`absolute -left-1 bottom-0 top-0 z-10 w-1.5 cursor-ew-resize touch-none transition-colors ${
              resizing === "w" ? "bg-primary/60" : "bg-transparent group-hover:bg-primary/30"
            }`}
          />
          <div
            onPointerDown={startResize("h")}
            aria-hidden
            className={`absolute -top-1 left-0 right-0 z-10 h-1.5 cursor-ns-resize touch-none transition-colors ${
              resizing === "h" ? "bg-primary/60" : "bg-transparent group-hover:bg-primary/30"
            }`}
          />
          {/* header */}
          <div className="flex items-center justify-between bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="bot-orb bg-brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-white">
                <Sparkles className="size-4" />
              </span>
              <ConversationMenu />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-1.5 text-[11px] text-secondary sm:flex">
                {aiStatus === null ? (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> AI Assistant · Online
                  </>
                ) : aiStatus.online ? (
                  aiStatus.attendance && aiStatus.cf && aiStatus.intent ? (
                    <>
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" /> ML Models · Online
                    </>
                  ) : (
                    <>
                      <span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> ML Models · Partial
                    </>
                  )
                ) : (
                  <>
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-500" /> Fallback Mode
                  </>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-ink"
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* messages */}
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m, i) =>
              m.from === "user" ? <UserBubble key={i} text={m.text} /> : <BotBubble key={i} text={m.text} />
            )}
            {typing && (
              <div className="flex justify-start">
                <div className="flex gap-1 rounded-2xl rounded-bl-md bg-muted px-4 py-3">
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

          {/* suggested options — shown until the first user message */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-3">
              {(suggestions.length ? suggestions : []).map((s) => (
                <button
                  key={s}
                  onClick={() => send(s, eventId)}
                  disabled={typing}
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-muted disabled:opacity-60"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask EventBot anything..."
              className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-ink outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white transition-opacity disabled:opacity-50"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Guided event-creation workspace (organizer-gated by the backend's
          "create-event" action + a local role check in the store). Rendered
          above the chat panel as an overlay dialog. */}
      <EventWizard />
    </>
  )
}
