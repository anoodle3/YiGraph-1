import type {
  Algorithm,
  AnalysisReport,
  ChartPoint,
  ChartType,
  DagEdge,
  DagNode,
  GraphData,
  NodeResult,
  SubProblem,
  WorkflowPlan,
} from "./types"

/**
 * 基于知识库中真实算法数据的 DAG 规划器。
 * 使用关键词启发式匹配，将用户自然语言问题拆解为子问题并构建 DAG 工作流。
 *
 * 当前为客户端模拟实现。后端 API 就绪后，planWorkflow / simulateNodeResult / generateReport
 * 的逻辑将移至服务端，前端通过 SSE 事件驱动渲染。
 */

interface PlannerInput {
  question: string
  algorithms: Algorithm[]
}

interface PlannerOutput {
  understanding: string
  subProblems: SubProblem[]
  nodes: DagNode[]
  edges: DagEdge[]
}

// 关键词 → 算法 ID（与 lib/api/algorithms.ts 假数据一致）
// 按常用程度排序，同一个规则最多取 2 个，确保跨类别多样性
const KEYWORD_MAP: { keywords: RegExp; algoIds: string[] }[] = [
  {
    keywords: /(影响|重要|关键|核心|kol|意见领袖|排名|pagerank|枢纽|权威|中心性)/i,
    algoIds: ["run_pagerank", "run_betweenness_centrality", "run_hits", "run_closeness_centrality"],
  },
  {
    keywords: /(社区|分群|群组|圈子|社团|模块|louvain|标签传播)/i,
    algoIds: ["run_louvain_communities", "run_label_propagation_communities", "run_clustering"],
  },
  {
    keywords: /(路径|路线|最短|导航|通勤|距离|直径)/,
    algoIds: ["run_dijkstra_path", "run_floyd_warshall", "run_diameter"],
  },
  {
    keywords: /(遍历|连通|可达|bfs|dfs|分量|搜索)/i,
    algoIds: ["run_bfs_tree", "run_dfs_tree", "run_connected_components"],
  },
  {
    keywords: /(流量|容量|最大流|供应|物流|网络流|割)/,
    algoIds: ["run_maximum_flow", "run_minimum_cut"],
  },
  {
    keywords: /(相似|推荐|好友|去重|jaccard)/i,
    algoIds: ["run_jaccard_coefficient"],
  },
  {
    keywords: /(环|循环|死锁|依赖|拓扑|dag|排序)/i,
    algoIds: ["run_find_cycle", "run_topological_sort"],
  },
  {
    keywords: /(匹配|分配|配对|资源)/,
    algoIds: ["run_max_weight_matching"],
  },
  {
    keywords: /(生成树|布线|电路|mst|最小树)/i,
    algoIds: ["run_minimum_spanning_tree"],
  },
  {
    keywords: /(三角|聚集|稠密|聚类系数|局部|同配)/,
    algoIds: ["run_clustering", "run_degree_assortativity_coefficient"],
  },
  {
    keywords: /(二分|二部|着色|颜色)/,
    algoIds: ["run_is_bipartite", "run_greedy_color"],
  },
  {
    keywords: /(效率|传输|信息|全局)/,
    algoIds: ["run_global_efficiency"],
  },
  {
    keywords: /(同构|结构对比|化学|分子)/,
    algoIds: ["run_is_isomorphic"],
  },
  {
    keywords: /(笛卡尔|乘积|图操作|组合)/,
    algoIds: ["run_cartesian_product"],
  },
]

const FALLBACK_IDS = [
  "run_pagerank",
  "run_louvain_communities",
  "run_betweenness_centrality",
]

function pickAlgorithms(question: string, algorithms: Algorithm[]): Algorithm[] {
  const hits: Algorithm[] = []
  const seen = new Set<string>()

  for (const rule of KEYWORD_MAP) {
    if (!rule.keywords.test(question)) continue
    let fromThisRule = 0
    for (const id of rule.algoIds) {
      if (hits.length >= 4 || fromThisRule >= 2) break
      const a = algorithms.find((x) => x.id === id)
      if (a && !seen.has(a.id)) {
        seen.add(a.id)
        hits.push(a)
        fromThisRule++
      }
    }
  }

  // 没有命中关键词时回退到通用组合
  if (hits.length === 0) {
    for (const id of FALLBACK_IDS) {
      const a = algorithms.find((x) => x.id === id)
      if (a) hits.push(a)
    }
  }

  return hits.slice(0, 4)
}

export function planWorkflow({
  question,
  algorithms,
}: PlannerInput): PlannerOutput {
  const picks = pickAlgorithms(question, algorithms)

  const dims = picks
    .map((a, i) => `(${i + 1}) ${a.displayName}——${a.summary.replace(/。$/, "")}`)
    .join("；")

  const understanding =
    `用户希望在图数据上分析「${trimQuestion(question)}」。` +
    `这是一个图分析问题，将从 ${picks.length} 个维度进行协同分析：${dims}。` +
    `最终汇总各维度结果，生成可解释的综合结论与行动建议。`

  const subProblems: SubProblem[] = picks.map((a, i) => ({
    id: `sp-${i + 1}`,
    title: subProblemTitleFor(a, i, picks.length),
    rationale: `针对「${a.displayName}」(${a.name})：${a.summary}可解答${a.useCases[0] || "该分析维度"}。`,
    algorithmId: a.id,
  }))

  const nodes: DagNode[] = []
  const edges: DagEdge[] = []

  // 预处理节点（使用图遍历算法构建初始图结构）
  const head: DagNode = {
    id: "n-pre",
    label: "数据预处理 & 图构建",
    algorithmId: "run_bfs_tree",
    subProblemId: "sp-0",
    status: "pending",
  }
  nodes.push(head)

  // 子问题节点（并行）
  subProblems.forEach((sp, i) => {
    const node: DagNode = {
      id: `n-${i + 1}`,
      label: sp.title,
      algorithmId: sp.algorithmId,
      subProblemId: sp.id,
      status: "pending",
    }
    nodes.push(node)
    edges.push({ id: `e-pre-${node.id}`, source: head.id, target: node.id })
  })

  // 汇总节点
  const tail: DagNode = {
    id: "n-report",
    label: "结果融合 & 综合分析报告",
    algorithmId: picks[0]?.id ?? FALLBACK_IDS[0],
    subProblemId: "sp-final",
    status: "pending",
  }
  nodes.push(tail)
  subProblems.forEach((_, i) => {
    edges.push({
      id: `e-${i + 1}-report`,
      source: `n-${i + 1}`,
      target: tail.id,
    })
  })

  return { understanding, subProblems, nodes, edges }
}

function trimQuestion(q: string) {
  const t = q.trim()
  return t.length > 60 ? `${t.slice(0, 60)}…` : t
}

function subProblemTitleFor(a: Algorithm, i: number, total: number): string {
  // 使用算法的 useCases 第一项作为标题核心
  const topic = a.useCases[0] ?? a.displayName
  if (total <= 2) {
    return `${topic}（${a.displayName}）`
  }
  const prefixes = [
    `维度一：${topic}`,
    `维度二：${topic}`,
    `维度三：${topic}`,
    `维度四：${topic}`,
  ]
  return `${prefixes[i] ?? topic}（${a.displayName}）`
}

/* ----------------------------- Execution mock ---------------------------- */

export function simulateNodeResult(
  node: DagNode,
  algorithm: Algorithm | undefined,
): NodeResult {
  const chartType: ChartType = algorithm?.chartPreference ?? "bar"
  const seedName = algorithm?.name ?? node.label
  const chartData = generateChartData(chartType, seedName)
  const code = generatePostProcessingCode(algorithm, chartType, seedName)
  const summary = algorithm
    ? `完成 ${algorithm.displayName}（${algorithm.name}）计算，复杂度 ${algorithm.complexity}。对输出结果进行了归一化与排序处理。`
    : `完成子任务「${node.label}」的执行。`
  const subGraph = mockSubGraph()
  return { summary, code, chartType, chartData, subGraph }
}

function mockSubGraph(): GraphData {
  return {
    nodes: [
      { id: "Alice", label: "Alice" },
      { id: "Bob", label: "Bob" },
      { id: "Carol", label: "Carol" },
      { id: "CorpX", label: "CorpX 公司" },
      { id: "Acct1", label: "账户 8801" },
    ],
    edges: [
      { id: "e1", source: "Alice", target: "Bob", label: "¥50,000", tooltip: "2024-03-15 转账" },
      { id: "e2", source: "Bob", target: "CorpX", label: "¥120,000", tooltip: "2024-03-16 对公转账" },
      { id: "e3", source: "Alice", target: "Carol", label: "¥30,000" },
      { id: "e4", source: "Carol", target: "Acct1", label: "¥85,000", tooltip: "2024-03-17 跨行转账" },
      { id: "e5", source: "CorpX", target: "Acct1", label: "¥200,000", tooltip: "2024-03-18 大额交易" },
    ],
  }
}

function generateChartData(type: ChartType, seedName: string): ChartPoint[] {
  const seed = hashString(seedName)
  const rand = mulberry32(seed)

  if (type === "pie") {
    const labels = ["社区 A", "社区 B", "社区 C", "社区 D", "其他"]
    return labels.map((l) => ({
      label: l,
      value: Math.round(rand() * 80 + 20),
    }))
  }
  if (type === "line") {
    return Array.from({ length: 10 }, (_, i) => ({
      label: `T${i + 1}`,
      value: Math.round(rand() * 60 + 20),
      value2: Math.round(rand() * 40 + 30),
    }))
  }
  if (type === "scatter") {
    return Array.from({ length: 24 }, (_, i) => ({
      label: `n${i + 1}`,
      value: Math.round(rand() * 100),
      value2: Math.round(rand() * 100),
    }))
  }
  if (type === "table") {
    return Array.from({ length: 6 }, (_, i) => ({
      label: `节点 ${i + 1}`,
      value: Math.round(rand() * 100),
    }))
  }
  // bar
  const topN = ["Alice", "Bob", "Carol", "Dave", "Erin", "Frank", "Grace", "Hank"]
  return topN.map((l) => ({
    label: l,
    value: Math.round(rand() * 80 + 20),
  }))
}

function generatePostProcessingCode(
  algorithm: Algorithm | undefined,
  chartType: ChartType,
  seedName: string,
): string {
  const funcName = algorithm?.name ?? seedName.replace(/[^a-zA-Z0-9_]/g, "_")
  return `# 对 ${funcName} 的输出进行后处理
import pandas as pd
import numpy as np

result = ${funcName}(graph)
df = pd.DataFrame(result.items(), columns=["node", "score"])

# 归一化
df["score"] = (df["score"] - df["score"].min()) / (df["score"].max() - df["score"].min() + 1e-9)

# Top-K 抽取，供 ${chartType} 图表展示
topk = df.sort_values("score", ascending=False).head(10)
render_chart(topk, kind="${chartType}")
`
}

export function generateReport(
  plan: WorkflowPlan,
  algorithms: Algorithm[],
): AnalysisReport {
  const used: Algorithm[] = []
  for (const sp of plan.subProblems) {
    const a = algorithms.find((x) => x.id === sp.algorithmId)
    if (a) used.push(a)
  }

  const findings = plan.nodes
    .filter((n) => n.result?.summary)
    .map((n) => n.result!.summary)

  // 根据使用的算法类型生成动态推荐
  const recommendations = buildRecommendations(used)

  // 根据算法类型生成模拟指标
  const metrics = buildMetrics(used)

  const algoList = used.map((a) => a.displayName).join("、")
  return {
    title: "图分析综合报告",
    executiveSummary:
      `${plan.understanding} 本次工作流共调度了 ${used.length} 个核心图算法（${algoList}），` +
      `输出结构化指标与可视化结论，用于支持后续决策。`,
    keyFindings:
      findings.length > 0
        ? findings
        : ["工作流已执行完成，详见各节点输出。"],
    recommendations,
    metrics,
  }
}

function buildRecommendations(used: Algorithm[]): string[] {
  const recs: string[] = []
  const hasCategory = (cat: string) => used.some((a) => a.category === cat)

  if (hasCategory("centrality") || hasCategory("link-analysis")) {
    recs.push("对排名靠前的关键节点进行人工审核，并在业务系统中加强监控与资源倾斜。")
  }
  if (hasCategory("community") || hasCategory("clustering")) {
    recs.push("将社区/聚类结果用于精细化运营，针对不同群体制定差异化的内容或活动策略。")
  }
  if (hasCategory("shortest-path") || hasCategory("flow")) {
    recs.push("将最优路径或流量分配方案导入路由/调度系统，实现资源配置自动化。")
  }
  if (hasCategory("cycles") || hasCategory("dag")) {
    recs.push("对检测到的循环依赖进行重构，消除潜在死锁风险。")
  }
  if (hasCategory("similarity")) {
    recs.push("将相似度计算结果集成到推荐引擎，提升召回与排序效果。")
  }

  if (recs.length === 0) {
    recs.push("将分析结果纳入定期巡检流程，持续监控指标变化趋势。")
    recs.push("结合业务场景对输出做二次加工，形成可落地的决策建议。")
  }
  return recs
}

function buildMetrics(used: Algorithm[]): AnalysisReport["metrics"] {
  const metrics: AnalysisReport["metrics"] = []
  const hasCategory = (cat: string) => used.some((a) => a.category === cat)

  if (hasCategory("centrality") || hasCategory("link-analysis")) {
    metrics.push(
      { label: "核心节点数", value: String(Math.floor(Math.random() * 30 + 5)), trend: "up" },
    )
  }
  if (hasCategory("community") || hasCategory("clustering")) {
    metrics.push(
      { label: "发现社区数", value: String(Math.floor(Math.random() * 8 + 2)), trend: "flat" },
      { label: "模块度 Q", value: (Math.random() * 0.4 + 0.4).toFixed(2), trend: "up" },
    )
  }
  if (hasCategory("shortest-path") || hasCategory("distance")) {
    metrics.push(
      { label: "平均最短路径", value: (Math.random() * 4 + 2).toFixed(1), trend: "down" },
    )
  }
  if (hasCategory("flow")) {
    metrics.push(
      { label: "最大流值", value: String(Math.floor(Math.random() * 500 + 100)), trend: "up" },
    )
  }
  if (hasCategory("efficiency")) {
    metrics.push(
      { label: "全局效率", value: (Math.random() * 0.5 + 0.3).toFixed(3), trend: "up" },
    )
  }

  if (metrics.length === 0) {
    metrics.push(
      { label: "分析节点数", value: String(Math.floor(Math.random() * 100 + 50)), trend: "flat" },
      { label: "执行耗时", value: (Math.random() * 3 + 0.5).toFixed(1) + "s", trend: "down" },
    )
  }
  return metrics
}

/** 将分析报告转为 Markdown 文本 */
export function reportToMarkdown(report: AnalysisReport): string {
  const lines: string[] = []
  lines.push(`# ${report.title}`)
  lines.push("")
  lines.push("## 结论概要")
  lines.push("")
  lines.push(report.executiveSummary)
  lines.push("")

  if (report.metrics.length > 0) {
    lines.push("## 关键指标")
    lines.push("")
    for (const m of report.metrics) {
      const trend = m.trend === "up" ? " ↑" : m.trend === "down" ? " ↓" : ""
      lines.push(`- **${m.label}**：${m.value}${trend}`)
    }
    lines.push("")
  }

  if (report.keyFindings.length > 0) {
    lines.push("## 主要发现")
    lines.push("")
    for (const f of report.keyFindings) {
      lines.push(`- ${f}`)
    }
    lines.push("")
  }

  if (report.recommendations.length > 0) {
    lines.push("## 后续建议")
    lines.push("")
    report.recommendations.forEach((r, i) => {
      lines.push(`${i + 1}. ${r}`)
    })
    lines.push("")
  }

  return lines.join("\n")
}

/* ----------------------------- Helpers ----------------------------------- */
function hashString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
