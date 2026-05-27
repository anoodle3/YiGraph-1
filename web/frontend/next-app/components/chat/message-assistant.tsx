"use client"

import * as React from "react"
import { Sparkles } from "lucide-react"
import { useI18n } from "@/core/i18n/i18n-provider"
import type { ChatMessage, WorkflowPlan } from "@/core/types"
import { ThinkingSteps } from "./thinking-steps"
import { DagPanel } from "./dag-panel"
import { ExecutionPanel } from "./execution-panel"
import { AnalysisReport } from "./analysis-report"

export function MessageAssistant({
  message,
  onExecute,
  onModify,
  interactive,
}: {
  message: ChatMessage
  onExecute: () => void
  onModify: (modificationText: string) => void
  interactive: boolean
}) {
  const { t } = useI18n()
  const plan = message.plan
  if (!plan) return null

  const phase = plan.phase

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className="text-foreground">{t("chat.engine", "易图 规划引擎")}</span>
          <span>·</span>
          <span>{phaseLabel(phase, t)}</span>
        </div>

        <div className="flex flex-col gap-4">
          {plan.error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {plan.error}
            </div>
          )}
          <ThinkingSteps plan={plan} />

          {(phase === "dag-ready" ||
            phase === "executing" ||
            phase === "executed") && (
            <DagPanel plan={plan} onExecute={onExecute} onModify={onModify} interactive={interactive} />
          )}

          {(phase === "executing" || phase === "executed") && (
            <ExecutionPanel plan={plan} />
          )}

          {/* Markdown from backend, or structured report from mock */}
          {(plan.markdown || plan.report) && (
            <AnalysisReport report={plan.report} markdown={plan.markdown} />
          )}
        </div>
      </div>
    </div>
  )
}

function phaseLabel(phase: WorkflowPlan["phase"], t: (k: string, f?: string) => string) {
  switch (phase) {
    case "understanding": return t("dag.phaseUnderstanding", "正在理解问题")
    case "decomposing":   return t("dag.phaseDecomposing", "正在拆解子问题")
    case "selecting":     return t("dag.phaseSelecting", "正在选择算法")
    case "dag-ready":     return t("dag.phaseReady", "DAG 构建完成")
    case "executing":     return t("dag.phaseExecuting", "工作流执行中")
    case "executed":      return t("dag.phaseExecuted", "分析报告已生成")
    default:              return t("dag.phaseThinking", "思考中")
  }
}
