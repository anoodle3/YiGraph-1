"use client"

import * as React from "react"
import {
  Sparkles,
  Search,
  BookOpen,
  ListTree,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/core/utils"
import { useI18n } from "@/core/i18n/i18n-provider"
import { useAlgorithms } from "@/core/algorithms-store"
import type { Algorithm, AlgorithmCategory, Lang } from "@/core/types"
import { useToast } from "@/hooks/use-toast"

type Stage = "idle" | "searching" | "parsing" | "drafting" | "done" | "error"

interface DraftResult {
  algorithm: Algorithm
  sources: { title: string; url: string }[]
}

export function AddAlgorithmDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { t, lang } = useI18n()
  const { algorithms, addAlgorithm } = useAlgorithms()
  const { toast } = useToast()
  const [name, setName] = React.useState("")
  const [stage, setStage] = React.useState<Stage>("idle")
  const [draft, setDraft] = React.useState<DraftResult | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  function reset() {
    setName("")
    setStage("idle")
    setDraft(null)
    setError(null)
  }

  async function handleSearch() {
    const trimmed = name.trim()
    if (!trimmed) return
    if (
      algorithms.some(
        (a) =>
          a.name.toLowerCase() === trimmed.toLowerCase() ||
          a.displayName === trimmed,
      )
    ) {
      setError(t("algorithms.duplicateError", "该算法已存在于知识库中。"))
      setStage("error")
      return
    }
    setError(null)
    setStage("searching")
    await sleep(900)
    setStage("parsing")
    await sleep(900)
    setStage("drafting")
    await sleep(900)
    const result = fabricateAlgorithm(trimmed, lang)
    setDraft(result)
    setStage("done")
  }

  function handleConfirm() {
    if (!draft) return
    addAlgorithm(draft.algorithm)
    toast({
      title: t("algorithms.addedTitle", "已添加到知识库"),
      description: t("algorithms.addedDesc", "{name} 现在可用于工作流规划。").replace("{name}", `${draft.algorithm.displayName} (${draft.algorithm.name})`),
    })
    onOpenChange(false)
    setTimeout(reset, 200)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setTimeout(reset, 200)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t("algorithms.addDialogTitle", "智能扩充算法知识")}
          </DialogTitle>
          <DialogDescription>
            {t("algorithms.addDialogDesc", "输入算法名称，系统将自动检索相关资料并扩充到知识库。")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="algo-name">{t("algorithms.nameLabel", "算法名称")}</Label>
            <Input
              id="algo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("algorithms.namePlaceholder", "例如：Katz Centrality / HITS / GCN")}
              disabled={stage !== "idle" && stage !== "error"}
            />
          </div>

          {/* Pipeline visualization */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <StageList stage={stage} />
            {stage === "error" && error && (
              <div className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                {error}
              </div>
            )}
          </div>

          {/* Draft preview */}
          {stage === "done" && draft && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-semibold">
                  {draft.algorithm.name.slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">
                    {draft.algorithm.displayName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      ({draft.algorithm.name})
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {draft.algorithm.summary}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {draft.algorithm.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-3">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {t("algorithms.references", "参考来源")}
                </div>
                <ul className="flex flex-col gap-1.5">
                  {draft.sources.map((s) => (
                    <li
                      key={s.url}
                      className="flex items-center gap-2 text-xs text-foreground/80"
                    >
                      <BookOpen className="size-3 text-primary" />
                      <span className="truncate">{s.title}</span>
                      <span className="truncate font-mono text-muted-foreground">
                        {s.url}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {stage === "done" ? (
            <>
              <Button variant="outline" onClick={reset}>
                {t("algorithms.research", "重新搜索")}
              </Button>
              <Button onClick={handleConfirm} className="gap-2">
                <CheckCircle2 className="size-4" />
                {t("algorithms.confirmAdd", "确认加入知识库")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "取消")}
              </Button>
              <Button
                onClick={handleSearch}
                disabled={
                  !name.trim() ||
                  stage === "searching" ||
                  stage === "parsing" ||
                  stage === "drafting"
                }
                className="gap-2"
              >
                {stage === "searching" ||
                stage === "parsing" ||
                stage === "drafting" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Search className="size-4" />
                )}
                {t("algorithms.searchGenerate", "检索并生成")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function StageList({ stage }: { stage: Stage }) {
  const { t } = useI18n()
  const steps: { key: Stage; label: string; icon: React.ElementType }[] = [
    { key: "searching", label: t("algorithms.stepSearch", "检索相关学术资料与文档"), icon: Search },
    { key: "parsing", label: t("algorithms.stepParse", "解析关键字段（定义、复杂度、输入输出）"), icon: BookOpen },
    { key: "drafting", label: t("algorithms.stepDraft", "生成结构化算法条目"), icon: ListTree },
  ]
  const order: Stage[] = ["idle", "searching", "parsing", "drafting", "done"]
  const idx = order.indexOf(stage)

  return (
    <ol className="flex flex-col gap-2">
      {steps.map((s, i) => {
        const stepIdx = order.indexOf(s.key)
        const isActive = stage === s.key
        const isDone = idx > stepIdx
        const Icon = s.icon
        return (
          <li key={s.key} className="flex items-center gap-3 text-xs">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-md border",
                isDone
                  ? "border-accent/40 bg-accent/15 text-accent-foreground"
                  : isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              {isDone ? (
                <CheckCircle2 className="size-3.5" />
              ) : isActive ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Icon className="size-3.5" />
              )}
            </div>
            <span
              className={cn(
                isActive
                  ? "text-foreground"
                  : isDone
                    ? "text-foreground/80"
                    : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
            {isActive && i < steps.length && (
              <span className="ml-auto text-[10px] text-primary">{t("algorithms.executing", "执行中…")}</span>
            )}
            {isDone && (
              <span className="ml-auto text-[10px] text-accent-foreground">
                {t("algorithms.completed", "已完成")}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

function fabricateAlgorithm(
  name: string,
  lang: Lang,
): DraftResult {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `custom-${Date.now()}`
  const displayName = `${name} 算法`

  const algorithm: Algorithm = {
    id,
    name,
    displayName,
    category: "centrality" as AlgorithmCategory,
    summary: `${name} 是一种图分析算法。`,
    description: `${name} 在图上执行特定计算，适用于多种分析场景。`,
    useCases: ["图分析"],
    chartPreference: "bar",
    complexity: "O(V+E)",
    inputs: ["图 G"],
    outputs: ["计算结果"],
    tags: ["AI 扩展", "图分析"],
  }

  const sources = [
    {
      title: `${name} — Wikipedia`,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`,
    },
    {
      title: `${name} 综述论文`,
      url: `https://arxiv.org/search/?query=${encodeURIComponent(name)}`,
    },
    {
      title: `${name} 工程实践`,
      url: `https://neo4j.com/docs/graph-data-science/current/algorithms/`,
    },
  ]

  return { algorithm, sources }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}
