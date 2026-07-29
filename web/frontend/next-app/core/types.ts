export type Lang = "zh-CN" | "en-US"

export type AlgorithmCategory = string

export interface Algorithm {
  id: string
  name: string
  displayName: string
  category: AlgorithmCategory
  summary: string
  description: string
  complexity: string
  inputs: string[]
  outputs: string[]
  useCases: string[]
  chartPreference: ChartType
  tags: string[]
}

export type ChartType = "bar" | "line" | "pie" | "table" | "scatter"

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  /** When role === "assistant", holds the plan/execution state */
  plan?: WorkflowPlan
}

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  messages: ChatMessage[]
}

export interface SubProblem {
  id: string
  title: string
  rationale: string
  algorithmId: string
}

export interface DagNode {
  id: string
  label: string
  algorithmId: string
  subProblemId: string
  status: NodeStatus
  /** 无算法时的任务类型标签（如 "数值分析"、"图算法"） */
  taskType?: string
  /** Simulated execution output */
  result?: NodeResult
}

export type NodeStatus = "pending" | "running" | "done" | "error"

export interface DagEdge {
  id: string
  source: string
  target: string
}

export interface NodeResult {
  summary: string
  code?: string
  chartType?: ChartType
  chartData?: ChartPoint[]
  /** Sub-graph for relationship/path visualization */
  subGraph?: GraphData
}

export interface ChartPoint {
  label: string
  value: number
  /** Optional secondary value for line charts */
  value2?: number
}

export interface WorkflowPlan {
  /** High level understanding of the user question */
  understanding: string
  subProblems: SubProblem[]
  nodes: DagNode[]
  edges: DagEdge[]
  /** Phase of the assistant reply */
  phase:
    | "understanding"
    | "decomposing"
    | "selecting"
    | "dag-ready"
    | "executing"
    | "executed"
  /** streaming progress for each phase 0-1 */
  progress: {
    understanding: number
    decomposing: number
    selecting: number
  }
  /** Accumulated markdown from result (text) events */
  markdown?: string
  /** Error message from backend, if any */
  error?: string
  /** Final analysis report, available after execution */
  report?: AnalysisReport
}

export interface AnalysisReport {
  title: string
  executiveSummary: string
  keyFindings: string[]
  recommendations: string[]
  metrics: { label: string; value: string; trend?: "up" | "down" | "flat" }[]
}

// === Dataset / File management types ===

export type FileType = "raw-data" | "graph-data"

export interface Dataset {
  id: string
  name: string
  fileType: FileType
  fileCount: number
  createdAt: string
}

export type ParseStatus = "pending" | "parsing" | "completed" | "error"

export interface FileItem {
  id: string
  name: string
  size: number
  type: string
  uploadTime: string
  parseStatus: ParseStatus
  progress: number
  datasetId: string
}

export interface GraphNode {
  id: string
  label: string
  group?: string
  color?: string
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label?: string
  tooltip?: string
}

export interface GraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export interface UploadConfig {
  vertexLabelField?: string
  edgeSourceField?: string
  edgeTargetField?: string
  graphName?: string
}

export type FileType2 = "csv" | "txt" | "pdf" | "docx" | "md"

export interface PreviewData {
  type: FileType2
  content: string
  headers?: string[]
  rows?: string[][]
  totalPages?: number
}

// === Model management types ===

export interface Model {
  id: string
  name: string
  baseUrl: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

// === Feedback types ===

export interface FeedbackEntry {
  timestamp: string
  userQuestion: string
  analysisOutput: string
  type: "dag" | "report"
  feedback: "like" | "dislike"
}
