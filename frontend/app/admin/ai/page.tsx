"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AppShell } from "@/components/app/app-shell"
import { Reveal } from "@/components/anim/reveal"
import { useCurrentUser } from "@/lib/queries/auth"
import {
  aiApi,
  type AiChatlogResponse,
  type AiModelMeta,
  type AiStatusResponse,
} from "@/lib/api/ai"
import {
  Brain,
  CheckCircle2,
  Cpu,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
  CalendarDays,
  FlaskConical,
  Ticket,
  MessageSquare,
  ShieldAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const MODEL_LABELS: Record<string, { name: string; desc: string }> = {
  attendance: { name: "Attendance Prediction", desc: "HistGradientBoosting regression over event features" },
  cf: { name: "Recommendations (CF)", desc: "SVD + nearest-neighbor collaborative filtering from ticket history" },
  intent: { name: "Chatbot Intent Classifier", desc: "TF-IDF (word + char n-grams) with LinearSVC, trained on seed corpus + labeled chat log" },
}

const INTENT_OPTIONS = [
  "recommend", "near_me", "my_tickets", "pricing", "organizer",
  "upcoming_events", "venue", "schedule", "registration_status",
  "popular_events", "capacity", "cancellation", "greeting", "categories",
  "event_count", "fallback",
]

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
      }`}
    >
      {ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
      {label}
    </span>
  )
}

function ModelCard({
  keyName,
  meta,
  health,
}: {
  keyName: string
  meta?: AiModelMeta
  health?: boolean
}) {
  const label = MODEL_LABELS[keyName]
  const trained = !!meta?.trained
  const reached = !!(health && trained)
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Brain className="size-5" />
        </span>
        <StatusPill
          ok={reached}
          label={reached ? "Active" : health ? "Not trained" : "Service down"}
        />
      </div>
      <h3 className="font-display mt-4 text-base font-semibold text-ink">{label.name}</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{label.desc}</p>
      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
        <p>
          Samples: <span className="font-medium text-ink">{meta?.samples ?? 0}</span>
        </p>
        <p>
          Trained:{" "}
          <span className="font-medium text-ink">
            {meta?.trainedAt ? new Date(meta.trainedAt).toLocaleString() : "Never"}
          </span>
        </p>
      </div>
    </div>
  )
}

export default function AdminAiPage() {
  const { data: userData } = useCurrentUser()
  const user = userData?.user
  // The AI console retrains platform-wide models and reads cross-tenant
  // chatlog data (backend: requireSystemAdmin on /api/ai) — a tenant admin
  // (role "admin" WITH an organization) has no legitimate use for it and
  // every call here would 403, so skip fetching and show why instead of a
  // page full of failed requests.
  const isSystemAdmin = user?.role === "admin"

  const [status, setStatus] = useState<AiStatusResponse | null>(null)
  const [chatlog, setChatlog] = useState<AiChatlogResponse | null>(null)
  const [training, setTraining] = useState(false)
  const [trainResult, setTrainResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [testMessage, setTestMessage] = useState("")
  const [testResult, setTestResult] = useState<{ intent: string | null; score: number | null } | null>(null)
  const [testing, setTesting] = useState(false)

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([aiApi.status(), aiApi.chatlog({ limit: 50 })])
    setStatus(s)
    setChatlog(c)
  }, [])

  useEffect(() => {
    if (!isSystemAdmin) return
    load().catch(() => setError("Failed to load AI service status."))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSystemAdmin])

  const handleTrain = async () => {
    setTraining(true)
    setTrainResult(null)
    setError(null)
    try {
      const result = await aiApi.train()
      const parts = Object.entries(result)
        .filter(([key]) => key !== "trainedAt")
        .map(([key, meta]) => `${key}: ${meta.trained ? "trained" : "skipped"} (${meta.samples ?? 0} samples)`)
      setTrainResult(parts.join(" · ") || "Training completed.")
      await load()
    } catch {
      setError("Training failed — make sure the AI service is running.")
    } finally {
      setTraining(false)
    }
  }

  const handleClassify = async () => {
    if (!testMessage.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      setTestResult(await aiApi.classify(testMessage.trim()))
    } catch {
      setTestResult({ intent: null, score: null })
    } finally {
      setTesting(false)
    }
  }

  const handlePatchIntent = async (id: string, intent: string) => {
    try {
      await aiApi.patchChatlog(id, intent)
      await load()
    } catch {
      setError("Could not update sample.")
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this training sample? It will stop being used on the next retrain.")) return
    try {
      await aiApi.deleteChatlog(id)
      await load()
    } catch {
      setError("Could not remove sample.")
    }
  }

  const health = status?.health
  const stats = status?.stats
  const distribution = useMemo(() => {
    const entries = Object.entries(stats?.intentDistribution ?? {})
    const max = Math.max(1, ...entries.map(([, count]) => count))
    return { entries, max }
  }, [stats])

  return (
    <AppShell role="Administrator" userName={user?.name || "Admin"} title="AI Training">
      <div className="space-y-8">
        <Reveal className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">AI Training Console</h1>
          <p className="text-sm text-muted-foreground">
            Train, inspect and curate the machine-learning models powering recommendations, attendance
            prediction and the chatbot.
          </p>
        </Reveal>

        {!isSystemAdmin ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex items-center gap-3">
              <ShieldAlert className="size-5" />
              <p className="text-sm font-medium">
                Only the system admin (admin without an organization) can access AI training —
                the models and chat samples here are shared across every tenant. Your account is
                scoped to a tenant.
              </p>
            </div>
          </div>
        ) : (
          <>
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Reveal stagger={0.08} y={24} className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Cpu className="size-5" />
            </span>
            <h3 className="font-display mt-4 text-base font-semibold text-ink">AI Service</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Python ML service proxied through the backend.
            </p>
            <div className="mt-4">
              <StatusPill
                ok={!!health?.online}
                label={health?.online ? "Online" : "Offline — fallback mode"}
              />
            </div>
            <Button
              className="mt-5 w-full"
              onClick={handleTrain}
              disabled={training || !health?.online}
            >
              {training ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {training ? "Retraining…" : "Retrain All Models"}
            </Button>
            {trainResult && (
              <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">{trainResult}</p>
            )}
          </div>

          <ModelCard keyName="attendance" meta={stats?.models.attendance} health={health?.attendance} />
          <ModelCard keyName="cf" meta={stats?.models.cf} health={health?.cf} />
          <ModelCard keyName="intent" meta={stats?.models.intent} health={health?.intent} />
        </Reveal>

        <Reveal className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Training Data</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Samples the models are fitted against, from a retrain.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { icon: CalendarDays, label: "Events", value: stats?.data.events ?? 0 },
                { icon: CalendarDays, label: "Past (attendance)", value: stats?.data.pastEvents ?? 0 },
                { icon: CalendarDays, label: "Upcoming / Live", value: stats?.data.upcomingEvents ?? 0 },
                { icon: Ticket, label: "Tickets (CF)", value: stats?.data.tickets ?? 0 },
                { icon: MessageSquare, label: "Chat log (intent)", value: stats?.data.chatlog ?? 0 },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <item.icon className="size-4" />
                    {item.label}
                  </div>
                  <p className="font-display mt-1 text-xl font-bold text-ink">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Intent Distribution</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Labeled messages per intent — the chatbot classifier&apos;s training signal.
            </p>
            <div className="mt-5 space-y-2.5">
              {distribution.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No logged chat intents yet. Use the chatbot to generate labeled samples.
                </p>
              ) : (
                distribution.entries.map(([intent, count]) => (
                  <div key={intent} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs font-medium text-ink">{intent}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/20">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${(count / distribution.max) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs text-muted-foreground">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>

        <Reveal className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Playground</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Test a message against the trained intent classifier.
          </p>
          <div className="mt-5 flex gap-3">
            <input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleClassify()}
              placeholder="e.g. anything free near me this weekend?"
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-ring"
            />
            <Button onClick={handleClassify} disabled={testing || !testMessage.trim() || !health?.online}>
              {testing ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
              Classify
            </Button>
          </div>
          {testResult && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              {testResult.intent ? (
                <>
                  <Sparkles className="size-4 text-primary" />
                  <span className="text-ink">
                    Predicted intent: <span className="font-semibold">{testResult.intent}</span>
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    confidence {Math.round(((testResult.score ?? 0) + 1) / 2 * 100)}%
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">
                  {health?.online ? "No confident prediction (score below threshold)." : "AI service is offline."}
                </span>
              )}
            </div>
          )}
        </Reveal>

        <Reveal className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Training Data Curation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fix mislabeled or remove noisy chat-log samples. Changes apply on the next retrain.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
              {chatlog?.total ?? 0} samples
            </span>
          </div>

          {!chatlog ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading samples…</p>
          ) : chatlog.samples.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">
              No chat-log samples yet. Every message the chatbot classifies confidently is logged here
              and becomes training data.
            </p>
          ) : (
            <div className="mt-5 space-y-3">
              {chatlog.samples.map((sample) => (
                <div
                  key={sample.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">&ldquo;{sample.message}&rdquo;</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {sample.createdAt ? new Date(sample.createdAt).toLocaleString() : "no date"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <select
                      defaultValue={sample.intent}
                      onChange={(e) => e.target.value !== sample.intent && handlePatchIntent(sample.id, e.target.value)}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs outline-none focus:border-ring"
                    >
                      {INTENT_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleDelete(sample.id)}
                      aria-label="Remove sample"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
          </>
        )}
      </div>
    </AppShell>
  )
}