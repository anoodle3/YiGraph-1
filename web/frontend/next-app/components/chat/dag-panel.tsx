"use client"

import * as React from "react"
import {
  Play,
  Wrench,
  Workflow,
  Info,
  CheckCircle2,
  Loader2,
  Circle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react"
import type { DagEdge, DagNode, WorkflowPlan } from "@/core/types"
import { useI18n } from "@/core/i18n/i18n-provider"
import { useAlgorithms } from "@/core/algorithms-store"
import { submitFeedback } from "@/core/api/feedback"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/core/utils"
import { AlgorithmInfoModal } from "./algorithm-info-modal"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"


export function DagPanel({
  plan,
  userQuestion,
  onExecute,
  onModify,
  interactive,
}: {
  plan: WorkflowPlan
  userQuestion: string
  onExecute: () => void
  onModify: (modificationText: string) => void
  interactive: boolean
}) {
  const { t } = useI18n()
  const [infoId, setInfoId] = React.useState<string | null>(null)
  const [modifyOpen, setModifyOpen] = React.useState(false)
  const [modifyText, setModifyText] = React.useState("")
  const [feedback, setFeedback] = React.useState<"like" | "dislike" | null>(null)
  const phase = plan.phase
  const readyToExecute = phase === "dag-ready" && interactive

  const handleFeedback = (type: "like" | "dislike") => {
    if (feedback) return
    setFeedback(type)
    const dagSummary = JSON.stringify({
      nodes: plan.nodes.map((n) => ({ id: n.id, label: n.label, algorithmId: n.algorithmId })),
      edges: plan.edges.map((e) => ({ source: e.source, target: e.target })),
    })
    submitFeedback({
      userQuestion,
      analysisOutput: dagSummary,
      type: "dag",
      feedback: type,
    }).catch(() => {
      setFeedback(null)
    })
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <Workflow className="size-4 text-primary" />
          <span className="text-sm font-semibold">{t("dag.panelTitle", "工作流 DAG")}</span>
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {plan.nodes.length} {t("dag.nodes", "节点")} · {plan.edges.length} {t("dag.edges", "边")}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Info className="size-3" />
          {t("dag.inspectHint", "点击算法节点查看详情")}
          <span className="mx-1 text-border">|</span>
          <button
            onClick={() => handleFeedback("like")}
            disabled={feedback !== null}
            className={cn(
              "rounded p-0.5 transition-colors",
              feedback === "like"
                ? "text-primary"
                : "text-muted-foreground hover:text-primary",
              feedback !== null && feedback !== "like" && "opacity-40",
            )}
          >
            <ThumbsUp className={cn("size-3", feedback === "like" && "fill-primary")} />
          </button>
          <button
            onClick={() => handleFeedback("dislike")}
            disabled={feedback !== null}
            className={cn(
              "rounded p-0.5 transition-colors",
              feedback === "dislike"
                ? "text-destructive"
                : "text-muted-foreground hover:text-destructive",
              feedback !== null && feedback !== "dislike" && "opacity-40",
            )}
          >
            <ThumbsDown className={cn("size-3", feedback === "dislike" && "fill-destructive")} />
          </button>
        </div>
      </div>

      <div className="relative">
        <DagCanvas plan={plan} onInspect={setInfoId} />
      </div>

      {readyToExecute && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {t("dag.readyHint", "规划完成。请确认执行或修改 DAG。")}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setModifyText("")
                setModifyOpen(true)
              }}
            >
              <Wrench className="size-4" />
              {t("dag.modifyDag", "修改 DAG")}
            </Button>
            <Button className="gap-1.5" onClick={onExecute}>
              <Play className="size-4" />
              {t("dag.confirmExecute", "确定执行")}
            </Button>
          </div>
        </div>
      )}

      {phase === "executing" && (
        <div className="flex items-center gap-2 border-t border-border bg-primary/5 px-5 py-3 text-xs text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          {t("dag.executing", "执行中")}
        </div>
      )}

      {phase === "executed" && (
        <div className="flex items-center gap-2 border-t border-border bg-accent/10 px-5 py-3 text-xs text-accent-foreground">
          <CheckCircle2 className="size-3.5" />
          {t("dag.executed", "执行完成")}
        </div>
      )}

      <AlgorithmInfoModal
        algorithmId={infoId}
        onClose={() => setInfoId(null)}
      />

      <Dialog open={modifyOpen} onOpenChange={setModifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dag.modifyTitle", "修改工作流 DAG")}</DialogTitle>
            <DialogDescription>
              {t("dag.modifyDesc", "请输入您的 DAG 修改建议")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              id="dag-modify-text"
              placeholder={t("dag.modifyPlaceholder", "描述您想要如何调整这个工作流…")}
              value={modifyText}
              onChange={(e) => setModifyText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModifyOpen(false)}>
              {t("common.cancel", "取消")}
            </Button>
            <Button
              onClick={() => {
                if (modifyText.trim()) {
                  onModify(modifyText.trim())
                  setModifyOpen(false)
                }
              }}
              disabled={!modifyText.trim()}
            >
              {t("common.confirm", "确认")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/* -------------------------------- Canvas --------------------------------- */

interface Pos {
  x: number
  y: number
}

const NODE_W = 200
const NODE_MIN_H = 78
const COL_GAP = 260
const ROW_GAP = 32

function computeLayout(
  nodes: DagNode[],
  edges: DagEdge[],
): Record<string, Pos> {
  const positions: Record<string, Pos> = {}

  // mock 模式：有明确的 n-pre / n-report 节点 → 三列固定布局
  const head = nodes.find((n) => n.id === "n-pre")
  const tail = nodes.find((n) => n.id === "n-report")

  if (head || tail) {
    const middle = nodes.filter((n) => n !== head && n !== tail)
    const totalHeight = Math.max(
      middle.length * NODE_MIN_H + (middle.length - 1) * ROW_GAP,
      NODE_MIN_H,
    )
    if (head) {
      positions[head.id] = { x: 20, y: totalHeight / 2 - NODE_MIN_H / 2 + 20 }
    }
    middle.forEach((n, i) => {
      positions[n.id] = {
        x: 20 + COL_GAP,
        y: 20 + i * (NODE_MIN_H + ROW_GAP),
      }
    })
    if (tail) {
      positions[tail.id] = {
        x: 20 + COL_GAP * 2,
        y: totalHeight / 2 - NODE_MIN_H / 2 + 20,
      }
    }
    return positions
  }

  // 后端 DAG 模式：根据拓扑自动分列
  const incoming = new Set<string>()
  const outgoing = new Set<string>()
  edges.forEach((e) => {
    outgoing.add(e.source)
    incoming.add(e.target)
  })

  const sources = nodes.filter(
    (n) => !incoming.has(n.id),
  )
  const sinks = nodes.filter(
    (n) => !outgoing.has(n.id),
  )
  const intermediates = nodes.filter(
    (n) => incoming.has(n.id) && outgoing.has(n.id),
  )

  const maxRows = Math.max(sources.length, intermediates.length, sinks.length, 1)
  const totalHeight = Math.max(
    maxRows * NODE_MIN_H + (maxRows - 1) * ROW_GAP,
    NODE_MIN_H,
  )

  sources.forEach((n, i) => {
    positions[n.id] = { x: 20, y: 20 + i * (NODE_MIN_H + ROW_GAP) }
  })
  intermediates.forEach((n, i) => {
    positions[n.id] = {
      x: 20 + COL_GAP,
      y: 20 + i * (NODE_MIN_H + ROW_GAP),
    }
  })
  sinks.forEach((n, i) => {
    positions[n.id] = {
      x: 20 + COL_GAP * 2,
      y: 20 + i * (NODE_MIN_H + ROW_GAP),
    }
  })

  return positions
}

function DagCanvas({
  plan,
  onInspect,
}: {
  plan: WorkflowPlan
  onInspect: (algoId: string) => void
}) {
  const { getById } = useAlgorithms()
  const positions = React.useMemo(
    () => computeLayout(plan.nodes, plan.edges),
    [plan.nodes, plan.edges],
  )

  // 根据实际布局计算画布尺寸
  const allPos = Object.values(positions)
  const width = Math.max(
    ...allPos.map((p) => p.x + NODE_W),
    400,
  ) + 20
  const height = Math.max(
    ...allPos.map((p) => p.y + NODE_MIN_H),
    200,
  ) + 20

  return (
    <div className="bg-dots w-full overflow-x-auto">
      <div
        className="relative"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        {/* Edges */}
        <svg
          className="absolute inset-0"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" className="fill-border" />
            </marker>
            <marker
              id="arrow-active"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="5"
              orient="auto"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="var(--primary)" />
            </marker>
          </defs>
          {plan.edges.map((edge) => (
            <EdgePath
              key={edge.id}
              edge={edge}
              nodes={plan.nodes}
              positions={positions}
            />
          ))}
        </svg>

        {/* Nodes */}
        {plan.nodes.map((node) => {
          const pos = positions[node.id]
          if (!pos) return null
          const algo = getById(node.algorithmId)
          const noAlgo = !node.algorithmId
          return (
            <DagNodeBox
              key={node.id}
              node={node}
              algoName={algo?.name ?? (noAlgo ? "" : node.algorithmId)}
              algoDisplayName={
                algo?.displayName ??
                (noAlgo ? (node.taskType ?? "") : node.algorithmId)
              }
              noAlgorithm={noAlgo}
              x={pos.x}
              y={pos.y}
              onInspect={() => onInspect(node.algorithmId)}
              isHead={node.id === "n-pre"}
              isTail={node.id === "n-report"}
            />
          )
        })}
      </div>
    </div>
  )
}

function EdgePath({
  edge,
  nodes,
  positions,
}: {
  edge: DagEdge
  nodes: DagNode[]
  positions: Record<string, Pos>
}) {
  const from = positions[edge.source]
  const to = positions[edge.target]
  if (!from || !to) return null
  const sourceNode = nodes.find((n) => n.id === edge.source)
  const targetNode = nodes.find((n) => n.id === edge.target)
  const x1 = from.x + NODE_W
  const y1 = from.y + NODE_MIN_H / 2
  const x2 = to.x
  const y2 = to.y + NODE_MIN_H / 2
  const midX = (x1 + x2) / 2
  const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`

  const isFlowing =
    sourceNode?.status === "done" && targetNode?.status === "running"
  const isActive =
    sourceNode?.status === "done" || sourceNode?.status === "running"

  return (
    <path
      d={d}
      fill="none"
      className={cn(
        isFlowing
          ? "stroke-primary edge-flow"
          : isActive
            ? "stroke-primary/60"
            : "stroke-border",
      )}
      strokeWidth={1.8}
      markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow)"}
    />
  )
}

function DagNodeBox({
  node,
  algoName,
  algoDisplayName,
  noAlgorithm,
  x,
  y,
  onInspect,
  isHead,
  isTail,
}: {
  node: DagNode
  algoName: string
  algoDisplayName: string
  noAlgorithm?: boolean
  x: number
  y: number
  onInspect: () => void
  isHead: boolean
  isTail: boolean
}) {
  const { t } = useI18n()
  const roleLabel = isHead
    ? t("dag.preprocess", "预处理")
    : isTail
      ? t("dag.aggregate", "汇总")
      : t("dag.subtask", "子任务")
  const statusBg =
    node.status === "done"
      ? "border-accent/40 bg-accent/10"
      : node.status === "running"
        ? "border-primary/50 bg-primary/5"
        : node.status === "error"
          ? "border-destructive/50 bg-destructive/10"
          : "border-border bg-card"
  const Icon =
    node.status === "done"
      ? CheckCircle2
      : node.status === "running"
        ? Loader2
        : Circle
  const iconColor =
    node.status === "done"
      ? "text-accent"
      : node.status === "running"
        ? "text-primary"
        : "text-muted-foreground"

  return (
    <div
      className={cn(
        "absolute flex flex-col rounded-lg border px-3 py-2 shadow-sm transition-colors",
        statusBg,
      )}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${NODE_W}px`,
        minHeight: `${NODE_MIN_H}px`,
      }}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-3.5 shrink-0",
            iconColor,
            node.status === "running" && "animate-spin",
          )}
        />
        <span className="truncate text-[11px] font-medium text-muted-foreground">
          {roleLabel}
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
          {node.id}
        </span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mt-1 truncate text-sm font-semibold text-foreground cursor-default">
            {node.label}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px]">
          {node.label}
        </TooltipContent>
      </Tooltip>
      {isHead || isTail ? (
        <span className="mt-auto text-[11px] text-muted-foreground">
          {isHead
            ? t("dag.buildGraph", "图构建 & 数据标准化")
            : t("dag.synthesize", "多维度结果综合")}
        </span>
      ) : noAlgorithm ? (
        <span className="mt-auto text-[11px] text-muted-foreground leading-tight">
          {algoDisplayName || t("dag.noAlgoTask", "—")}
        </span>
      ) : (
        <button
          onClick={onInspect}
          className="mt-auto flex items-start gap-1 self-start rounded text-[11px] text-primary underline-offset-2 hover:underline text-left"
        >
          <span className="font-mono break-all leading-tight">{algoName}</span>
          <span className="text-muted-foreground break-words leading-tight">· {algoDisplayName}</span>
        </button>
      )}
    </div>
  )
}
