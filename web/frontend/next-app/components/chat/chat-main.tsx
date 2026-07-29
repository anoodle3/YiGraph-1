"use client"

import * as React from "react"
import { Sparkles, Workflow, MessageSquare } from "lucide-react"
import type { ChatSession, Dataset, Model } from "@/core/types"
import { useI18n } from "@/core/i18n/i18n-provider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatInput, type ChatSettings } from "./chat-input"
import { MessageUser } from "./message-user"
import { MessageAssistant } from "./message-assistant"

export function ChatMain({
  session,
  onSubmit,
  onExecute,
  onModify,
  settings,
  onSettingsChange,
  datasets,
  models,
}: {
  session: ChatSession | null
  onSubmit: (q: string) => void
  onExecute: (messageId: string) => void
  onModify: (messageId: string, modificationText: string) => void
  settings: ChatSettings
  onSettingsChange: (s: ChatSettings) => void
  datasets: Dataset[]
  models: Model[]
}) {
  const { t } = useI18n()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const endRef = React.useRef<HTMLDivElement>(null)
  const interactive = settings.interactiveMode || settings.expertMode

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [session?.messages.length, session?.messages])

  const hasMessages = !!session?.messages.length

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-background">
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Workflow className="size-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">
              {session?.title || t("chat.heading", "新的分析会话")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("chat.subheading", "自然语言提问 · 自动规划 DAG · 生成可视化报告")}
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground md:flex">
          <span className="size-1.5 rounded-full bg-accent" />
          {t("chat.engineOnline", "规划引擎在线")}
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
            {!hasMessages && <EmptyState onPick={onSubmit} />}
            {session?.messages.map((m, i) =>
              m.role === "user" ? (
                <MessageUser key={m.id} message={m} />
              ) : (
                <MessageAssistant
                  key={m.id}
                  message={m}
                  userQuestion={
                    session.messages
                      .slice(0, i)
                      .findLast((p) => p.role === "user")?.content ?? ""
                  }
                  onExecute={() => onExecute(m.id)}
                  onModify={(text) => onModify(m.id, text)}
                  interactive={interactive}
                />
              ),
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <ChatInput
        onSubmit={onSubmit}
        disabled={isBusy(session)}
        settings={settings}
        onSettingsChange={onSettingsChange}
        datasets={datasets}
        models={models}
      />
    </section>
  )
}

function isBusy(session: ChatSession | null) {
  if (!session) return false
  const last = session.messages[session.messages.length - 1]
  if (!last || last.role !== "assistant") return false
  const p = last.plan?.phase
  return p === "understanding" || p === "decomposing" || p === "selecting" || p === "executing"
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  const { t } = useI18n()
  const suggestions = Array.from({ length: 4 }, (_, i) =>
    t(`chat.suggestions.${i}`),
  ).filter(Boolean)

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sparkles className="size-7" />
      </div>
      <h2 className="text-balance text-2xl font-semibold">
        {t("chat.emptyTitle", "描述你的图数据分析目标")}
      </h2>
      <p className="mt-2 max-w-xl text-pretty text-sm text-muted-foreground">
        {t("chat.emptyDesc")}
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s)}
            className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <MessageSquare className="mt-0.5 size-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-pretty text-sm text-foreground/90">{s}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
