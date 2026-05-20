// ============================================================
// 智能分析 WebSocket 聊天客户端
//
// 对接旧版 YiGraph 后端的 SocketIO 协议（chat_request / chat_response）。
// 后端不可用时自动回退到 dag-planner 客户端模拟。
// ============================================================

import { io, Socket } from "socket.io-client"
import type { Algorithm } from "@/core/types"

// --- 旧版后端 chat_response 格式 ---

export interface ChatResponse {
  type: "thinking" | "result" | "stream_end"
  contentType?: "text" | "dag" | "code"
  content?: unknown
  error?: string
}

export interface OldDagNode {
  id: string
  label: string
  tasktype: string
}

export interface OldDagEdge {
  from: string
  to: string
}

export interface OldDag {
  nodes: OldDagNode[]
  edges: OldDagEdge[]
}

// --- 发送参数 ---

export interface ChatRequest {
  message?: string
  model: string
  dataset: string
  dataset_type?: string
  mode?: "normal" | "interact"
  expert_mode?: boolean
  dag_confirm?: "yes" | "no"
  is_dag_modification?: boolean
  dag_id?: string
  modifications?: string
  request_id?: string
}

// --- 回调 ---

export type ChatStreamCallback = (event: ChatResponse) => void

// --- 连接管理 ---

let socket: Socket | null = null
const pendingCallbacks = new Map<string, ChatStreamCallback>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let serverUrl = ""

export function getChatSocket(): Socket | null {
  return socket
}

export function isChatConnected(): boolean {
  return socket?.connected ?? false
}

export function connectChatSocket(url: string): void {
  if (socket?.connected && url === serverUrl) return

  // 断开旧连接
  disconnectChatSocket()

  serverUrl = url
  socket = io(url, {
    path: "/socket.io",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 30000,
  })

  socket.on("connect", () => {
    console.log("[chat] SocketIO connected:", socket?.id)
  })

  socket.on("chat_response", (data: ChatResponse & { request_id?: string }) => {
    const rid = data.request_id
    if (rid && pendingCallbacks.has(rid)) {
      pendingCallbacks.get(rid)!(data)
    } else if (!rid) {
      // 兼容旧后端（未返回 request_id）：广播给所有等待中的回调
      pendingCallbacks.forEach((cb) => cb(data))
    }
  })

  socket.on("disconnect", (reason) => {
    console.log("[chat] SocketIO disconnected:", reason)
  })

  socket.on("connect_error", (err) => {
    console.warn("[chat] SocketIO connect error:", err.message)
  })
}

export function sendChatRequest(
  params: ChatRequest,
  callback: ChatStreamCallback,
): void {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  // 包装回调：stream_end / error 时自动清理
  const wrapped: ChatStreamCallback = (event) => {
    if (event.type === "stream_end" || event.error) {
      pendingCallbacks.delete(requestId)
    }
    callback(event)
  }

  pendingCallbacks.set(requestId, wrapped)

  if (socket?.connected) {
    const payload: Record<string, unknown> = { ...params, request_id: requestId }
    if (typeof payload.is_dag_modification === "boolean") {
      payload.is_dag_modification = payload.is_dag_modification ? "true" : "false"
    }
    socket.emit("chat_request", payload)
  } else {
    wrapped({
      type: "stream_end",
      error: "WebSocket not connected",
    })
  }
}

export function disconnectChatSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (socket) {
    socket.off("chat_response")
    socket.off("connect")
    socket.off("disconnect")
    socket.off("connect_error")
    socket.disconnect()
    socket = null
  }
  pendingCallbacks.clear()
  serverUrl = ""
}

// --- 解析 tasktype 提取算法名 ---

/**
 * 从 tasktype 字符串中提取算法名。
 * 格式示例:
 *   "Graph Algorithm (pagerank)"    → "pagerank"
 *   "Graph Algorithm"               → null
 *   "Numeric Analysis"              → null
 */
export function parseAlgorithmName(tasktype: string): string | null {
  const m = tasktype.match(/\(([^)]+)\)/)
  return m ? m[1].trim() : null
}


export function matchAlgorithm(
  name: string,
  algorithms: Algorithm[],
): Algorithm | undefined {
  // 精确匹配 name
  let a = algorithms.find((x) => x.name === name)
  if (a) return a
  // id 匹配（可能带 run_ 前缀）
  a = algorithms.find((x) => x.id === name || x.id === `run_${name}`)
  if (a) return a
  // 常见别名映射
  const aliases: Record<string, string> = {
    betweenness: "betweenness_centrality",
    closeness: "closeness_centrality",
    pagerank: "pagerank",
    hits: "hits",
    louvain: "louvain_communities",
    "label-propagation": "label_propagation_communities",
    "label_propagation": "label_propagation_communities",
    dijkstra: "dijkstra_path",
    "floyd-warshall": "floyd_warshall",
    bfs: "bfs_tree",
    dfs: "dfs_tree",
    "connected-components": "connected_components",
    "max-flow": "maximum_flow",
    "min-cut": "minimum_cut",
    clustering: "clustering",
    jaccard: "jaccard_coefficient",
    "is-bipartite": "is_bipartite",
    mst: "minimum_spanning_tree",
    "topological-sort": "topological_sort",
    "greedy-color": "greedy_color",
    "is-isomorphic": "is_isomorphic",
    "find-cycle": "find_cycle",
    "max-weight-matching": "max_weight_matching",
    assortativity: "degree_assortativity_coefficient",
    diameter: "diameter",
    "global-efficiency": "global_efficiency",
    "cartesian-product": "cartesian_product",
  }
  const resolved = aliases[name] ?? aliases[name.replace(/-/g, "_")]
  if (resolved) {
    return (
      algorithms.find((x) => x.name === resolved) ??
      algorithms.find((x) => x.id === `run_${resolved}`)
    )
  }
  return undefined
}
