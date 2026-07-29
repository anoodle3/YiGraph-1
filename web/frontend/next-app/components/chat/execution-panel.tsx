"use client"

import * as React from "react"
import {
  CheckCircle2,
  Loader2,
  Circle,
  Code2,
  BarChart2,
  Play,
} from "lucide-react"
import { useI18n } from "@/core/i18n/i18n-provider"
import type { DagNode, WorkflowPlan } from "@/core/types"
import { useAlgorithms } from "@/core/algorithms-store"
import { Card } from "@/components/ui/card"
import { cn } from "@/core/utils"
import { ChartRenderer } from "./chart-renderer"
import { SubGraphRenderer } from "./subgraph-renderer"
import { AlgorithmInfoModal } from "./algorithm-info-modal"

export function ExecutionPanel({ plan }: { plan: WorkflowPlan }) {
  const { t } = useI18n()
  const executing = plan.phase === "executing"
  const doneCount = plan.nodes.filter((n) => n.status === "done").length
  const [infoId, setInfoId] = React.useState<string | null>(null)

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Play className="size-4 text-primary" />
            <span className="text-sm font-semibold">{t("dag.executionDetail", "节点执行详情")}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            {doneCount} / {plan.nodes.length} {t("dag.done", "完成")}
            {executing && (
              <Loader2 className="ml-2 inline size-3 animate-spin align-middle text-primary" />
            )}
          </span>
        </div>
        <div className="flex flex-col">
          {plan.nodes.map((node, i) => (
            <NodeExecution
              key={node.id}
              node={node}
              index={i}
              isLast={i === plan.nodes.length - 1}
              onInspectAlgo={setInfoId}
            />
          ))}
        </div>
      </Card>
      <AlgorithmInfoModal
        algorithmId={infoId}
        onClose={() => setInfoId(null)}
      />
    </>
  )
}

function NodeExecution({
  node,
  index,
  isLast,
  onInspectAlgo,
}: {
  node: DagNode
  index: number
  isLast: boolean
  onInspectAlgo: (id: string) => void
}) {
  const { t } = useI18n()
  const { getById } = useAlgorithms()
  const algo = node.algorithmId ? getById(node.algorithmId) : undefined
  const noAlgo = !node.algorithmId
  const [codeOpen, setCodeOpen] = React.useState(false)

  const StatusIcon =
    node.status === "done"
      ? CheckCircle2
      : node.status === "running"
        ? Loader2
        : Circle

  const statusColor =
    node.status === "done"
      ? "text-accent"
      : node.status === "running"
        ? "text-primary"
        : "text-muted-foreground"

  return (
    <div
      className={cn(
        "relative px-5 py-5",
        !isLast && "border-b border-border",
        node.status === "pending" && "opacity-70",
      )}
    >
      <div className="flex items-start gap-4">
        {/* Status column */}
        <div className="flex flex-col items-center">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full border-2",
              node.status === "done"
                ? "border-accent bg-accent/10"
                : node.status === "running"
                  ? "border-primary bg-primary/10 pulse-ring"
                  : "border-border bg-muted",
            )}
          >
            <StatusIcon
              className={cn(
                "size-4",
                statusColor,
                node.status === "running" && "animate-spin",
              )}
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              {t("dag.nodeIndex", "节点 {n}").replace("{n}", String(index + 1))} · {node.id}
            </span>
            <span className="text-sm font-semibold text-foreground">
              {node.label}
            </span>
            {!noAlgo && (
              <button
                onClick={() => onInspectAlgo(node.algorithmId)}
                className="ml-auto rounded-md border border-border bg-card px-2 py-1 text-[11px] font-mono transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {algo?.name ?? node.algorithmId}
              </button>
            )}
          </div>

          {node.status === "pending" && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("dag.waitingUpstream", "等待上游节点完成后开始执行…")}
            </p>
          )}

          {node.status === "running" && (
            <p className="mt-2 flex items-center gap-2 text-xs text-primary">
              <Loader2 className="size-3 animate-spin" />
              {noAlgo
                ? t("dag.processing", "正在处理…")
                : t("dag.callingAlgo", "正在调用 {name} 并处理输出…").replace(
                    "{name}",
                    algo?.displayName ?? node.algorithmId,
                  )}
            </p>
          )}

          {node.status === "done" && node.result && (
            <div className="mt-3 flex flex-col gap-3">
              <p className="text-sm leading-relaxed text-foreground/90">
                {node.result.summary}
              </p>

              {/* Sub-graph */}
              {node.result.subGraph && (
                <div className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs font-medium">
                    <BarChart2 className="size-3.5 text-primary" />
                    {t("dag.visualOutput", "可视化输出")}
                  </div>
                  <div className="p-3">
                    <SubGraphRenderer graph={node.result.subGraph} />
                  </div>
                </div>
              )}

              {/* Chart */}
              {node.result.chartData && (
              <div className="rounded-lg border border-border bg-card">
                <div className="flex items-center justify-between border-b border-border px-4 py-2">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <BarChart2 className="size-3.5 text-primary" />
                    {t("dag.visualOutput", "可视化输出")}
                  </div>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                    {node.result.chartType}
                  </span>
                </div>
                <div className="p-4">
                  <ChartRenderer
                    type={node.result.chartType ?? "bar"}
                    data={node.result.chartData}
                  />
                </div>
              </div>
              )}

              {/* Code */}
              {node.result.code && (
              <div className="rounded-lg border border-border bg-card">
                <button
                  onClick={() => setCodeOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium transition-colors hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="size-3.5 text-primary" />
                    {t("dag.postProcessCode", "生成的后处理代码")}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {codeOpen ? t("dag.collapse", "收起") : t("dag.expand", "展开")}
                  </span>
                </button>
                {codeOpen && (
                  <pre className="overflow-x-auto border-t border-border bg-muted/40 p-4 font-mono text-[12px] leading-5 text-foreground/90">
                    <code>{node.result.code}</code>
                  </pre>
                )}
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
