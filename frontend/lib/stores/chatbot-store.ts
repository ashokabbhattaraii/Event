"use client"

import { create } from "zustand"
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware"
import { chatbotApi, type ChatMessage } from "@/lib/api/chatbot"
import { USER_KEY } from "@/lib/api/client"

// Chatbot state lives here (not inside the EventBot component) so the
// conversation survives page switches: AppShell unmounts and remounts per
// route, which used to wipe messages + backend context on every navigation.
// Conversations are persisted to localStorage, so history also survives
// full reloads — with multiple conversations to switch between, clear, or
// delete.

export type ChatFrom = "bot" | "user"

export interface ChatMsg {
  from: ChatFrom
  text: string
}

export interface ChatConversation {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMsg[]
  // role/content pairs kept in sync with messages — sent to the backend so
  // follow-ups ("and its price?") resolve in conversation context.
  context: ChatMessage[]
}

export interface AiStatus {
  online: boolean
  attendance: boolean
  cf: boolean
  intent: boolean
}

const SEED_MSG: ChatMsg = {
  from: "bot",
  text: "Hi, I'm EventBot 👋 — I can recommend events, check tickets, pricing, capacity and more. Try a suggestion below!",
}

// Organizers get an extra seed line so the creation capability is discoverable
// without any extra round-trip; attendees keep the attendee-oriented greeting.
export function seedMessageForRole(role?: string): ChatMsg {
  const isCreator = role === "organizer" || role === "admin"
  return {
    from: "bot",
    text: isCreator
      ? "Hi, I'm EventBot 👋 — I can answer questions about events, and I can also **create a new event for you** in minutes with a guided workspace. Try: \"create an event\" or tap a suggestion below!"
      : SEED_MSG.text,
  }
}

// The backend only consumes the last ~8 turns per query; keeping ~20 on the
// conversation keeps enough for multi-turn follow-ups without unbounded
// growth in localStorage.
const MAX_CONTEXT = 20
const MAX_STORED_CONVERSATIONS = 20

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// Whichever account is currently logged in (or "anon" when signed out) —
// read FRESH on every storage call, never cached, so a login/logout swap
// is picked up immediately rather than a stale id lingering in a closure.
const getCurrentUserId = (): string => {
  if (typeof window === "undefined") return "anon"
  try {
    const raw = localStorage.getItem(USER_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?._id || "anon"
  } catch {
    return "anon"
  }
}

// Parallel to getCurrentUserId: the signed-in user's role, read fresh from
// localStorage. Used to mirror the backend's action gating locally (e.g.
// never surface the creation workspace to an attendee even if a stale
// backend response ever carried the action flag).
const getCurrentUserRole = (): string => {
  if (typeof window === "undefined") return ""
  try {
    const raw = localStorage.getItem(USER_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed?.role || ""
  } catch {
    return ""
  }
}

// Namespaces the persisted localStorage key by the logged-in user. Without
// this, a single fixed key ("eventnexus-chatbot") means every account that
// ever uses this browser reads and writes the SAME conversation history —
// log out, a different person logs in, and they see the previous person's
// entire chat. Each user's history now lives under its own key
// ("eventnexus-chatbot:<their id>"), and callers must trigger a rehydrate
// (see resetChatbotForUserChange below) after login/logout so the running
// store re-reads from the newly-correct key instead of keeping whatever
// was loaded for whoever was signed in when the page first loaded.
const userScopedStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(`${name}:${getCurrentUserId()}`),
  setItem: (name, value) => localStorage.setItem(`${name}:${getCurrentUserId()}`, value),
  removeItem: (name) => localStorage.removeItem(`${name}:${getCurrentUserId()}`),
}

export function newConversation(): ChatConversation {
  return {
    id: uid(),
    title: "New chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [seedMessageForRole(getCurrentUserRole())],
    context: [],
  }
}

interface ChatbotState {
  open: boolean
  conversations: ChatConversation[]
  activeId: string
  input: string
  typing: boolean
  suggestions: string[]
  suggestionsFetched: boolean
  aiStatus: AiStatus | null
  // Guided event-creation workspace (organizers) — rendered as a modal
  // overlay on top of the chat; kept in the store so it survives route
  // changes just like the conversation itself.
  creationOpen: boolean

  setOpen: (open: boolean) => void
  setCreationOpen: (open: boolean) => void
  setInput: (value: string) => void
  setTyping: (value: boolean) => void
  setAiStatus: (status: AiStatus | null) => void
  setSuggestions: (suggestions: string[]) => void
  setSuggestionsFetched: (fetched: boolean) => void
  startNewConversation: () => void
  switchConversation: (id: string) => void
  deleteConversation: (id: string) => void
  clearActiveConversation: () => void
  send: (text: string, eventId?: string) => Promise<void>
  pushBotMessage: (text: string) => void
}

export const useChatbotStore = create<ChatbotState>()(
  persist(
    (set, get) => ({
      open: false,
      conversations: [newConversation()],
      activeId: "",
      input: "",
      typing: false,
      suggestions: [],
      suggestionsFetched: false,
      aiStatus: null,
      creationOpen: false,

      setOpen: (open) => set({ open }),
      setCreationOpen: (creationOpen) => set({ creationOpen }),
      setInput: (input) => set({ input }),
      setTyping: (typing) => set({ typing }),
      setAiStatus: (aiStatus) => set({ aiStatus }),
      setSuggestions: (suggestions) => set({ suggestions }),
      setSuggestionsFetched: (suggestionsFetched) => set({ suggestionsFetched }),

      startNewConversation: () => {
        const conversation = newConversation()
        set((s) => ({
          conversations: [conversation, ...s.conversations].slice(0, MAX_STORED_CONVERSATIONS),
          activeId: conversation.id,
          input: "",
        }))
      },

      switchConversation: (id) => {
        if (get().conversations.some((c) => c.id === id)) set({ activeId: id })
      },

      deleteConversation: (id) => {
        set((s) => {
          const rest = s.conversations.filter((c) => c.id !== id)
          if (!rest.length) {
            const fresh = newConversation()
            return { conversations: [fresh], activeId: fresh.id, input: "" }
          }
          return { conversations: rest, activeId: s.activeId === id ? rest[0].id : s.activeId }
        })
      },

      clearActiveConversation: () => {
        const fresh = newConversation()
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? fresh : c
          ),
          input: "",
        }))
      },

      // Programmatic bot reply (wizard results, system events): appends a
      // message and keeps the conversation context in sync, exactly as a
      // regular assistant turn would.
      pushBotMessage: (text) => {
        const { conversations, activeId } = get()
        const active = conversations.find((c) => c.id === activeId)
        if (!active) return
        set({
          conversations: conversations.map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  messages: [...c.messages, { from: "bot" as const, text }],
                  context: [...c.context, { role: "assistant" as const, content: text }].slice(-MAX_CONTEXT),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })
      },

      send: async (text, eventId) => {
        const { typing, conversations, activeId } = get()
        const trimmed = text.trim()
        if (!trimmed || typing) return
        if (!conversations.some((c) => c.id === activeId)) return

        const history = [...get().conversations.find((c) => c.id === activeId)!.context, { role: "user" as const, content: trimmed }]

        set({ input: "", typing: true })

        // Append the user message and (on first real message) name the
        // conversation after it. Functional update so concurrent sends stay
        // consistent even though the UI disables sending while typing.
        const appendUser = (state: ChatbotState) => ({
          conversations: state.conversations.map((c) =>
            c.id === state.activeId
              ? {
                  ...c,
                  title: c.messages.length <= 1 ? trimmed.slice(0, 40) : c.title,
                  messages: [...c.messages, { from: "user" as const, text: trimmed }],
                  context: history.slice(-MAX_CONTEXT),
                  updatedAt: Date.now(),
                }
              : c
          ),
        })
        set(appendUser)

        try {
          // The backend only needs the most recent turns for context.
          const res = await chatbotApi.query(trimmed, eventId, history.slice(-9))
          const reply = res.reply
          // Backend emits a UI affordance for organizer-gated intents; the
          // local role check is a second opinion so the workspace never
          // flashes open for a non-organizer.
          if (
            res.action === "create-event" &&
            ["organizer", "admin"].includes(getCurrentUserRole())
          ) {
            get().setCreationOpen(true)
          }
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === state.activeId
                ? {
                    ...c,
                    messages: [...c.messages, { from: "bot" as const, text: reply }],
                    context: [...history, { role: "assistant" as const, content: reply }].slice(-MAX_CONTEXT),
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }))
        } catch {
          set((state) => ({
            conversations: state.conversations.map((c) =>
              c.id === state.activeId
                ? {
                    ...c,
                    messages: [...c.messages, { from: "bot" as const, text: "I couldn't reach the server just now — please try again." }],
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }))
        } finally {
          set({ typing: false })
        }
      },
    }),
    {
      name: "eventnexus-chatbot",
      storage: createJSONStorage(() => userScopedStorage),
      partialize: (s) => ({
        conversations: s.conversations,
        activeId: s.activeId || s.conversations[0]?.id,
      }),
      // Repair rehydrated data (schema changes, hand-edited localStorage):
      // every conversation gets a seed greeting if empty, a title, and a
      // context array; the active conversation must exist in the list.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ChatbotState>
        const stored = Array.isArray(p.conversations) && p.conversations.length ? p.conversations : current.conversations
        const conversations = stored
          .map((c) => ({
            ...newConversation(),
            ...c,
            title: c.title || "New chat",
            messages: c.messages?.length ? c.messages : [SEED_MSG],
            context: Array.isArray(c.context) ? c.context : [],
          }))
          .slice(0, MAX_STORED_CONVERSATIONS)
        const activeId = conversations.some((c) => c.id === p.activeId)
          ? (p.activeId as string)
          : conversations[0].id
        return { ...current, conversations, activeId }
      },
    }
  )
)

// Call this right after login/register/Google-login succeeds and right
// after logout. The store is a module-level singleton created once when
// the app loads, so it doesn't automatically notice that localStorage's
// USER_KEY changed underneath it — without this, switching accounts in the
// same tab (no full page reload) would keep showing whichever user's
// conversations happened to be loaded first. Clears in-memory state to a
// fresh conversation immediately (so nothing from the previous account
// flashes on screen) then re-reads from the now-correct per-user key.
export function resetChatbotForUserChange() {
  const fresh = newConversation()
  useChatbotStore.setState({
    conversations: [fresh],
    activeId: fresh.id,
    open: false,
    creationOpen: false,
    input: "",
    typing: false,
  })
  void useChatbotStore.persist.rehydrate()
}
