"use client"

import * as React from "react"
import { useChat } from "@/core/chat-store"
import { useAlgorithms } from "@/core/algorithms-store"
import { useDatasets } from "@/core/datasets-store"
import { useModels } from "@/core/models-store"
import { ChatHistory } from "./chat-history"
import { ChatMain } from "./chat-main"
import { planWorkflow, simulateNodeResult, generateReport, reportToMarkdown } from "@/core/dag-planner"
import type { ChatMessage, SubProblem, WorkflowPlan } from "@/core/types"
import type { ChatSettings } from "./chat-input"
import {
  connectChatSocket,
  disconnectChatSocket,
  isChatConnected,
  matchAlgorithm,
  sendChatRequest,
} from "@/core/api/chat"
import {
  createAdapterState,
  processChatEvent,
  convertOldDagToPlan,
} from "@/core/chat-adapter"
import { getBaseUrl } from "@/core/api/base"

export function ChatWorkspace() {
  const {
    sessions,
    activeSession,
    activeId,
    createSession,
    selectSession,
    deleteSession,
    appendMessage,
    renameSession,
    updatePlan,
  } = useChat()
  const { algorithms, getById } = useAlgorithms()
  const { datasets } = useDatasets()
  const { models } = useModels()

  const [settings, setSettings] = React.useState<ChatSettings>({
    model: "",
    dataset: "",
    expertMode: false,
    interactiveMode: false,
  })

  // WebSocket 连接管理
  const wsRef = React.useRef(false)
  React.useEffect(() => {
    if (wsRef.current) return
    wsRef.current = true
    ;(async () => {
      const url = await getBaseUrl()
      connectChatSocket(url)
    })()
    return () => {
      disconnectChatSocket()
      wsRef.current = false
    }
  }, [])

  // Auto-select first model / dataset
  React.useEffect(() => {
    if (!settings.model && models.length > 0) {
      setSettings((s) => ({ ...s, model: models[0].id }))
    }
  }, [models, settings.model])

  React.useEffect(() => {
    if (!settings.dataset && datasets.length > 0) {
      setSettings((s) => ({ ...s, dataset: datasets[0].id }))
    }
  }, [datasets, settings.dataset])

  React.useEffect(() => {
    if (!activeId && sessions[0]) selectSession(sessions[0].id)
  }, [activeId, sessions, selectSession])

  // 理解阶段进度条缓慢前进的定时器（每个消息独立）
  const progressTimersRef = React.useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())

  function startUnderstandingProgress(sessionId: string, msgId: string) {
    const key = `${sessionId}-${msgId}`
    if (progressTimersRef.current.has(key)) return
    let p = 0
    const timer = setInterval(() => {
      p += 0.035
      if (p >= 0.9) {
        p = 0.9
        const t = progressTimersRef.current.get(key)
        if (t) {
          clearInterval(t)
          progressTimersRef.current.delete(key)
        }
      }
      updatePlan(sessionId, msgId, (plan) => ({
        ...plan,
        progress: { ...plan.progress, understanding: p },
      }))
    }, 350)
    progressTimersRef.current.set(key, timer)
  }

  function finishUnderstandingProgress(sessionId: string, msgId: string) {
    const key = `${sessionId}-${msgId}`
    const t = progressTimersRef.current.get(key)
    if (t) {
      clearInterval(t)
      progressTimersRef.current.delete(key)
    }
    updatePlan(sessionId, msgId, (plan) => ({
      ...plan,
      progress: { ...plan.progress, understanding: 1 },
    }))
  }

  /** 通过 WebSocket 发送并处理流式响应 */
  const handleSubmitViaWS = React.useCallback(
    (question: string, sessionId: string, assistantMsgId: string) => {
      const model = models.find((m) => m.id === settings.model)
      const dataset = datasets.find((d) => d.id === settings.dataset)

      const adapter = createAdapterState()
      /** 保存 DAG 到达时转换好的节点列表，供 stream_end 时执行模拟使用 */
      let savedNodes: WorkflowPlan["nodes"] = []

      sendChatRequest(
        {
          message: question,
          model: model?.name ?? settings.model,
          dataset: dataset?.name ?? settings.dataset,
          dataset_type: dataset?.fileType === "graph-data" ? "graph" : "text",
          mode: settings.interactiveMode ? "interact" : "normal",
          expert_mode: settings.expertMode,
        },
        async (event) => {
          const result = processChatEvent(event, adapter)

          switch (result.kind) {
            case "thinking": {
              startUnderstandingProgress(sessionId, assistantMsgId)
              updatePlan(sessionId, assistantMsgId, (p) => ({
                ...p,
                phase: "understanding" as const,
                understanding: adapter.thinkingText,
              }))
              break
            }

            case "subproblems": {
              finishUnderstandingProgress(sessionId, assistantMsgId)
              const subProblems: SubProblem[] = result.subqueries.map(
                (q, i) => ({
                  id: `sp-${i + 1}`,
                  title: q.query,
                  rationale: "",
                  algorithmId: "",
                }),
              )
              updatePlan(sessionId, assistantMsgId, (p) => ({
                ...p,
                phase: "decomposing" as const,
                subProblems,
                progress: {
                  ...p.progress,
                  understanding: 1,
                  decomposing: 0,
                  selecting: 0,
                },
              }))
              // 真实子问题列表已到：走完拆解进度（UI 按进度逐条揭示真实条目）
              animatePhase(sessionId, assistantMsgId, "decomposing", updatePlan)
              break
            }

            case "algorithm_selected": {
              const sel = result.selection
              updatePlan(sessionId, assistantMsgId, (p) => {
                // 按子问题原文匹配（与 adapter.subqueries 顺序一致）
                const subProblems = p.subProblems.map((sp, i) => {
                  const q = adapter.subqueries[i]
                  if (!q || q.query !== sel.question) return sp
                  const algo = sel.algorithm
                    ? matchAlgorithm(sel.algorithm, algorithms)
                    : undefined
                  const taskLabel =
                    sel.task_type === "graph_query"
                      ? "Graph Query / 图查询"
                      : sel.task_type === "numeric_analysis"
                        ? "Numeric Analysis / 数值分析"
                        : undefined
                  return {
                    ...sp,
                    algorithmId: algo?.id ?? "",
                    rationale: algo
                      ? `${algo.displayName}（${algo.name}）：${algo.summary}`
                      : (taskLabel ?? sp.rationale),
                  }
                })
                const total = Math.max(1, adapter.subqueries.length)
                const done = Math.min(adapter.stepAlgorithms.size, total)
                return {
                  ...p,
                  phase: "selecting" as const,
                  subProblems,
                  progress: {
                    ...p.progress,
                    selecting: done / total,
                  },
                }
              })
              break
            }

            case "dag": {
              finishUnderstandingProgress(sessionId, assistantMsgId)
              const planData = convertOldDagToPlan(
                result.dag,
                adapter.thinkingText,
                algorithms,
                adapter.stepAlgorithms,
              )

              // dag-ready：拆解/选算法过程已由上面的真实事件流驱动
              savedNodes = planData.nodes
              updatePlan(sessionId, assistantMsgId, (p) => ({
                ...p,
                phase: "dag-ready" as const,
                understanding: planData.understanding,
                subProblems: planData.subProblems,
                nodes: planData.nodes,
                edges: planData.edges,
                progress: { understanding: 1, decomposing: 1, selecting: 1 },
              }))
              break
            }

            case "result_text": {
              updatePlan(sessionId, assistantMsgId, (p) => ({
                ...p,
                markdown: (p.markdown ?? "") + result.text + "\n\n",
              }))
              break
            }

            case "stream_end": {
              finishUnderstandingProgress(sessionId, assistantMsgId)
              if (
                adapter.resultParagraphs.length > 0 &&
                !settings.interactiveMode &&
                !settings.expertMode
              ) {
                // auto 模式且后端已返回文本：模拟逐节点执行
                const nodes = savedNodes

                updatePlan(sessionId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "executing" as const,
                }))

                for (const node of nodes) {
                  updatePlan(sessionId, assistantMsgId, (p) => ({
                    ...p,
                    nodes: p.nodes.map((n) =>
                      n.id === node.id
                        ? { ...n, status: "running" as const }
                        : n,
                    ),
                  }))
                  await sleep(700)
                  const algo = getById(node.algorithmId)
                  const nodeResult = simulateNodeResult(node, algo)
                  updatePlan(sessionId, assistantMsgId, (p) => ({
                    ...p,
                    nodes: p.nodes.map((n) =>
                      n.id === node.id
                        ? { ...n, status: "done" as const, result: nodeResult }
                        : n,
                    ),
                  }))
                  await sleep(200)
                }

                updatePlan(sessionId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "executed" as const,
                }))
              }
              break
            }

            case "error": {
              finishUnderstandingProgress(sessionId, assistantMsgId)
              updatePlan(sessionId, assistantMsgId, (p) => ({
                ...p,
                error: result.message,
                understanding: p.understanding || `错误：${result.message}`,
              }))
              break
            }
          }
        },
      )
    },
    [algorithms, models, datasets, settings, getById, updatePlan],
  )

  /** 用户点击"确认执行" */
  const handleExecute = React.useCallback(
    (messageId: string) => {
      if (!activeId) return

      const session = sessions.find((s) => s.id === activeId)
      const msg = session?.messages.find((m) => m.id === messageId)
      const plan = msg?.plan
      if (!plan) return

      // 保存节点列表供闭包内使用（不依赖后续 sessions 状态）
      const execNodes = plan.nodes

      // interact / expert 模式 + WebSocket 已连接 → 发给后端执行
      if (
        isChatConnected() &&
        (settings.interactiveMode || settings.expertMode)
      ) {
        const model = models.find((m) => m.id === settings.model)
        const dataset = datasets.find((d) => d.id === settings.dataset)
        const adapter = createAdapterState()

        // 立即给用户反馈：切到执行阶段，节点全标为等待
        updatePlan(activeId, messageId, (p) => ({
          ...p,
          phase: "executing" as const,
          nodes: p.nodes.map((n) => ({ ...n, status: "pending" as const })),
        }))

        sendChatRequest(
          {
            dag_confirm: "yes",
            dag_id: sessionIdToDagId(activeId, messageId),
            model: model?.name ?? settings.model,
            dataset: dataset?.name ?? settings.dataset,
            dataset_type:
              dataset?.fileType === "graph-data" ? "graph" : "text",
            mode: "interact",
          },
          async (event) => {
            const result = processChatEvent(event, adapter)

            if (result.kind === "thinking") {
              updatePlan(activeId, messageId, (p) => ({
                ...p,
                understanding:
                  p.understanding +
                  "\n\n" +
                  String(result.text ?? ""),
              }))
              return
            }

            if (result.kind === "result_text") {
              updatePlan(activeId, messageId, (p) => ({
                ...p,
                markdown: (p.markdown ?? "") + result.text + "\n\n",
              }))
              return
            }

            if (result.kind === "stream_end") {
              updatePlan(activeId, messageId, (p) => ({
                ...p,
                phase: "executing" as const,
              }))

              for (const node of execNodes) {
                updatePlan(activeId, messageId, (p) => ({
                  ...p,
                  nodes: p.nodes.map((n) =>
                    n.id === node.id
                      ? { ...n, status: "running" as const }
                      : n,
                  ),
                }))
                await sleep(700)
                const algo = getById(node.algorithmId)
                const nodeResult = simulateNodeResult(node, algo)
                updatePlan(activeId, messageId, (p) => ({
                  ...p,
                  nodes: p.nodes.map((n) =>
                    n.id === node.id
                      ? { ...n, status: "done" as const, result: nodeResult }
                      : n,
                  ),
                }))
                await sleep(200)
              }

              updatePlan(activeId, messageId, (p) => ({
                ...p,
                phase: "executed" as const,
              }))
            }

            if (result.kind === "error") {
              updatePlan(activeId, messageId, (p) => ({
                ...p,
                phase: "executed" as const,
                error: result.message,
              }))
            }
          },
        )
        return
      }

      // WebSocket 未连接或非 interact 模式 → 客户端模拟
      const runMock = async () => {
        updatePlan(activeId, messageId, (p) => ({
          ...p,
          phase: "executing" as const,
        }))
        for (const node of execNodes) {
          updatePlan(activeId, messageId, (p) => ({
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === node.id
                ? { ...n, status: "running" as const }
                : n,
            ),
          }))
          await sleep(900)
          const algo = getById(node.algorithmId)
          const result = simulateNodeResult(node, algo)
          updatePlan(activeId, messageId, (p) => ({
            ...p,
            nodes: p.nodes.map((n) =>
              n.id === node.id
                ? { ...n, status: "done" as const, result }
                : n,
            ),
          }))
          await sleep(220)
        }
        const report = generateReport(
          { ...plan, phase: "executed" },
          algorithms,
        )
        const md = reportToMarkdown(report)
        updatePlan(activeId, messageId, (p) => ({
          ...p,
          phase: "executed" as const,
          markdown: md,
        }))
      }
      runMock()
    },
    [activeId, algorithms, getById, sessions, settings, models, datasets, updatePlan],
  )

  /** 修改 DAG */
  const handleModifyDag = React.useCallback(
    (originalMsgId: string, modificationText: string) => {
      if (!activeId) return

      const userMsg: ChatMessage = {
        id: `m-${Date.now()}-u`,
        role: "user",
        content: modificationText,
        createdAt: new Date().toISOString(),
      }
      appendMessage(activeId, userMsg)

      const plan: WorkflowPlan = {
        understanding: "",
        subProblems: [],
        nodes: [],
        edges: [],
        phase: "understanding",
        progress: { understanding: 0, decomposing: 0, selecting: 0 },
      }

      const assistantMsgId = `m-${Date.now()}-a`
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        plan,
      }
      appendMessage(activeId, assistantMsg)

      if (isChatConnected()) {
        const model = models.find((m) => m.id === settings.model)
        const dataset = datasets.find((d) => d.id === settings.dataset)
        const adapter = createAdapterState()
        let savedNodes: WorkflowPlan["nodes"] = []

        sendChatRequest(
          {
            is_dag_modification: true,
            modifications: modificationText,
            dag_id: sessionIdToDagId(activeId, originalMsgId),
            message: modificationText,
            model: model?.name ?? settings.model,
            dataset: dataset?.name ?? settings.dataset,
            dataset_type:
              dataset?.fileType === "graph-data" ? "graph" : "text",
            mode: "interact",
          },
          async (event) => {
            const result = processChatEvent(event, adapter)

            switch (result.kind) {
              case "thinking":
                startUnderstandingProgress(activeId, assistantMsgId)
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "understanding" as const,
                  understanding: adapter.thinkingText,
                }))
                break

              case "subproblems": {
                finishUnderstandingProgress(activeId, assistantMsgId)
                const subProblems: SubProblem[] = result.subqueries.map(
                  (q, i) => ({
                    id: `sp-${i + 1}`,
                    title: q.query,
                    rationale: "",
                    algorithmId: "",
                  }),
                )
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "decomposing" as const,
                  subProblems,
                  progress: {
                    ...p.progress,
                    understanding: 1,
                    decomposing: 0,
                    selecting: 0,
                  },
                }))
                // 修改后的真实子问题列表已到：走完拆解进度（UI 按进度逐条揭示）
                animatePhase(activeId, assistantMsgId, "decomposing", updatePlan)
                break
              }

              case "algorithm_selected": {
                const sel = result.selection
                updatePlan(activeId, assistantMsgId, (p) => {
                  // 按子问题原文匹配（与 adapter.subqueries 顺序一致）
                  const subProblems = p.subProblems.map((sp, i) => {
                    const q = adapter.subqueries[i]
                    if (!q || q.query !== sel.question) return sp
                    const algo = sel.algorithm
                      ? matchAlgorithm(sel.algorithm, algorithms)
                      : undefined
                    const taskLabel =
                      sel.task_type === "graph_query"
                        ? "Graph Query / 图查询"
                        : sel.task_type === "numeric_analysis"
                          ? "Numeric Analysis / 数值分析"
                          : undefined
                    return {
                      ...sp,
                      algorithmId: algo?.id ?? "",
                      rationale: algo
                        ? `${algo.displayName}（${algo.name}）：${algo.summary}`
                        : (taskLabel ?? sp.rationale),
                    }
                  })
                  const total = Math.max(1, adapter.subqueries.length)
                  const done = Math.min(adapter.stepAlgorithms.size, total)
                  return {
                    ...p,
                    phase: "selecting" as const,
                    subProblems,
                    progress: {
                      ...p.progress,
                      selecting: done / total,
                    },
                  }
                })
                break
              }

              case "dag": {
                finishUnderstandingProgress(activeId, assistantMsgId)
                const planData = convertOldDagToPlan(
                  result.dag,
                  adapter.thinkingText,
                  algorithms,
                  adapter.stepAlgorithms,
                )

                // dag-ready：拆解/选算法过程已由上面的真实事件流驱动
                savedNodes = planData.nodes
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "dag-ready" as const,
                  understanding: planData.understanding,
                  subProblems: planData.subProblems,
                  nodes: planData.nodes,
                  edges: planData.edges,
                  progress: { understanding: 1, decomposing: 1, selecting: 1 },
                }))
                break
              }

              case "result_text":
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  markdown: (p.markdown ?? "") + result.text + "\n\n",
                }))
                break

              case "stream_end":
                finishUnderstandingProgress(activeId, assistantMsgId)
                break

              case "error":
                finishUnderstandingProgress(activeId, assistantMsgId)
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  error: result.message,
                  understanding: p.understanding || `错误：${result.message}`,
                }))
                break
            }
          },
        )
      } else {
        // WebSocket 未连接 → mock
        const planDraft = planWorkflow({
          question: modificationText,
          algorithms,
        })
        updatePlan(activeId, assistantMsgId, (p) => ({
          ...p,
          understanding: planDraft.understanding,
          subProblems: planDraft.subProblems,
          nodes: planDraft.nodes,
          edges: planDraft.edges,
        }))
        animatePhase(activeId, assistantMsgId, "understanding", updatePlan).then(
          () => {
            animatePhase(activeId, assistantMsgId, "decomposing", updatePlan)
              .then(() =>
                animatePhase(
                  activeId,
                  assistantMsgId,
                  "selecting",
                  updatePlan,
                ),
              )
              .then(() =>
                updatePlan(activeId, assistantMsgId, (p) => ({
                  ...p,
                  phase: "dag-ready",
                })),
              )
          },
        )
      }
    },
    [
      activeId,
      algorithms,
      appendMessage,
      models,
      datasets,
      settings,
      updatePlan,
    ],
  )

  /** 提交问题 */
  const handleSubmit = React.useCallback(
    async (question: string) => {
      let sessionId = activeId
      if (!sessionId) sessionId = createSession(truncate(question, 28))
      const current = sessions.find((s) => s.id === sessionId)
      if (
        current &&
        current.messages.length === 0 &&
        !current.title
      ) {
        renameSession(sessionId, truncate(question, 28))
      }

      const userMsg: ChatMessage = {
        id: `m-${Date.now()}-u`,
        role: "user",
        content: question,
        createdAt: new Date().toISOString(),
      }
      appendMessage(sessionId, userMsg)

      // 初始的空 plan（phase: understanding, progress 全 0）
      const plan: WorkflowPlan = {
        understanding: "",
        subProblems: [],
        nodes: [],
        edges: [],
        phase: "understanding",
        progress: { understanding: 0, decomposing: 0, selecting: 0 },
      }

      const assistantMsgId = `m-${Date.now()}-a`
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
        plan,
      }
      appendMessage(sessionId, assistantMsg)

      // 判断使用 WebSocket 还是 mock
      if (isChatConnected()) {
        handleSubmitViaWS(question, sessionId, assistantMsgId)
      } else {
        // 回退到客户端 mock
        const planDraft = planWorkflow({ question, algorithms })
        updatePlan(sessionId, assistantMsgId, (p) => ({
          ...p,
          understanding: planDraft.understanding,
          subProblems: planDraft.subProblems,
          nodes: planDraft.nodes,
          edges: planDraft.edges,
        }))
        await animatePhase(sessionId, assistantMsgId, "understanding", updatePlan)
        await animatePhase(sessionId, assistantMsgId, "decomposing", updatePlan)
        await animatePhase(sessionId, assistantMsgId, "selecting", updatePlan)

        if (settings.interactiveMode || settings.expertMode) {
          // 交互模式：停在 dag-ready，等用户确认或修改
          updatePlan(sessionId, assistantMsgId, (p) => ({
            ...p,
            phase: "dag-ready",
          }))
        } else {
          // 普通模式：自动执行
          const nodes = planDraft.nodes
          updatePlan(sessionId, assistantMsgId, (p) => ({
            ...p,
            phase: "executing" as const,
          }))
          for (const node of nodes) {
            updatePlan(sessionId, assistantMsgId, (p) => ({
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === node.id ? { ...n, status: "running" as const } : n,
              ),
            }))
            await sleep(700)
            const algo = getById(node.algorithmId)
            const result = simulateNodeResult(node, algo)
            updatePlan(sessionId, assistantMsgId, (p) => ({
              ...p,
              nodes: p.nodes.map((n) =>
                n.id === node.id
                  ? { ...n, status: "done" as const, result }
                  : n,
              ),
            }))
            await sleep(200)
          }
          const report = generateReport(
            { ...planDraft, phase: "executed" } as WorkflowPlan,
            algorithms,
          )
          const md = reportToMarkdown(report)
          updatePlan(sessionId, assistantMsgId, (p) => ({
            ...p,
            phase: "executed" as const,
            markdown: md,
          }))
        }
      }
    },
    [
      activeId,
      algorithms,
      appendMessage,
      createSession,
      handleSubmitViaWS,
      renameSession,
      sessions,
      updatePlan,
    ],
  )

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <ChatHistory
        sessions={sessions}
        activeId={activeId}
        onSelect={selectSession}
        onCreate={() => createSession()}
        onDelete={deleteSession}
      />
      <ChatMain
        session={activeSession}
        onSubmit={handleSubmit}
        onExecute={handleExecute}
        onModify={handleModifyDag}
        settings={settings}
        onSettingsChange={setSettings}
        datasets={datasets}
        models={models}
      />
    </div>
  )
}

async function animatePhase(
  sessionId: string,
  messageId: string,
  phase: "understanding" | "decomposing" | "selecting",
  updatePlan: ReturnType<typeof useChat>["updatePlan"],
) {
  updatePlan(sessionId, messageId, (p) => ({ ...p, phase }))
  // 前 16 步到 0.9，最后第 17 步跳到 1.0
  const mainSteps = 16
  for (let i = 1; i <= mainSteps; i++) {
    await sleep(65)
    updatePlan(sessionId, messageId, (p) => ({
      ...p,
      progress: { ...p.progress, [phase]: (i / mainSteps) * 0.9 },
    }))
  }
  // 在 0.9 停顿一小段
  await sleep(400)
  updatePlan(sessionId, messageId, (p) => ({
    ...p,
    progress: { ...p.progress, [phase]: 1 },
  }))
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

function truncate(s: string, n: number) {
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n)}…` : t
}

function sessionIdToDagId(sessionId: string, messageId: string): string {
  return `dag-${sessionId}-${messageId}`
}
