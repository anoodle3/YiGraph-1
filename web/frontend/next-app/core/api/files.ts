import type { FileItem, GraphData, PreviewData, UploadConfig } from "@/core/types"

import { getBaseUrl } from "./base"

interface BackendFile {
  id: number
  name: string
  size: number
  type: "text" | "graph"
  uploadDate: string
  graph_status: string
  parsing_rate?: number
  edge_size?: number
  vertex_file?: string
  vertex_size?: number
}

function toFileItem(b: BackendFile, datasetId: string): FileItem {
  const status = b.graph_status === "completed"
    ? "completed" as const
    : b.graph_status === "parsing"
      ? "parsing" as const
      : "pending" as const
  return {
    id: String(b.id),
    name: b.name,
    size: b.size,
    type: b.name.split(".").pop()?.toLowerCase() ?? "txt",
    uploadTime: b.uploadDate,
    parseStatus: status,
    progress: (b.parsing_rate ?? 0) * 100,
    datasetId,
  }
}

export async function getFiles(datasetId: string): Promise<FileItem[]> {
  const res = await fetch(`${await getBaseUrl()}/api/knowledge_bases/${datasetId}/files`)
  const json = await res.json()
  if (!json.success) return []
  return (json.data as BackendFile[]).map((f) => toFileItem(f, datasetId))
}

export async function getGraphData(
  datasetId: string,
  kbName: string,
  fileNames: string[],
): Promise<{ graph: GraphData; triplets: [string, string, string][] } | null> {
  const res = await fetch(`${await getBaseUrl()}/api/generate_graph`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kb_id: Number(datasetId),
      kb_name: kbName,
      files: fileNames,
    }),
  })
  const json = await res.json()
  if (!json.success || !json.triplets) return null

  const triplets = json.triplets as [string, string, string][]
  const nodeMap = new Map<string, string>()
  const nodes: GraphData["nodes"] = []
  const edges: GraphData["edges"] = []
  let nodeIdx = 0
  let edgeIdx = 0

  for (const t of triplets) {
    if (!nodeMap.has(t[0])) {
      nodeMap.set(t[0], `n${nodeIdx++}`)
      nodes.push({ id: nodeMap.get(t[0])!, label: t[0] })
    }
    if (!nodeMap.has(t[2])) {
      nodeMap.set(t[2], `n${nodeIdx++}`)
      nodes.push({ id: nodeMap.get(t[2])!, label: t[2] })
    }
    edges.push({
      id: `e${edgeIdx++}`,
      source: nodeMap.get(t[0])!,
      target: nodeMap.get(t[2])!,
      label: t[1],
    })
  }
  return { graph: { nodes, edges }, triplets }
}

export async function uploadFile(
  datasetId: string,
  file: File,
  fileType: string,
  _config?: UploadConfig,
): Promise<FileItem> {
  const formData = new FormData()
  formData.append("kb_id", datasetId)
  formData.append("file", file)
  formData.append("file_type", fileType)

  const res = await fetch(`${await getBaseUrl()}/api/upload_file`, {
    method: "POST",
    body: formData,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "上传文件失败")

  return {
    id: String(Date.now()),
    name: file.name,
    size: file.size,
    type: file.name.split(".").pop()?.toLowerCase() ?? "txt",
    uploadTime: new Date().toISOString(),
    parseStatus: "pending",
    progress: 0,
    datasetId,
  }
}

export async function deleteFile(datasetId: string, fileName: string): Promise<void> {
  const res = await fetch(
    `${await getBaseUrl()}/api/delete_file?kb_id=${datasetId}&file_name=${encodeURIComponent(fileName)}`,
  )
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "删除文件失败")
}

export async function parseFile(datasetId: string, fileName: string): Promise<void> {
  const res = await fetch(
    `${await getBaseUrl()}/api/parse_control?kb_id=${datasetId}&file_name=${encodeURIComponent(fileName)}&action=parse`,
  )
  const json = await res.json()
  if (!json.success && !json.error?.includes("already parse")) {
    throw new Error(json.error ?? "解析失败")
  }
}

export async function getParseStatus(
  datasetId: string,
): Promise<Record<string, { status: FileItem["parseStatus"]; progress: number }>> {
  const res = await fetch(`${await getBaseUrl()}/api/check_parsing_status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kb_id: Number(datasetId) }),
  })
  const json = await res.json()
  if (!json.success) return {}

  const result: Record<string, { status: FileItem["parseStatus"]; progress: number }> = {}
  for (const [name, val] of Object.entries(json.file_status as Record<string, unknown>)) {
    if (typeof val === "string") {
      result[name] = {
        status: val === "completed" ? "completed" : val === "parsing" ? "parsing" : "pending",
        progress: val === "completed" ? 100 : 0,
      }
    } else if (Array.isArray(val)) {
      result[name] = {
        status: val[0] === "completed" ? "completed" : val[0] === "parsing" ? "parsing" : "pending",
        progress: (typeof val[1] === "number" ? val[1] : 0) * 100,
      }
    }
  }
  return result
}

export async function previewFile(datasetId: string, fileName: string): Promise<PreviewData> {
  const res = await fetch(
    `${await getBaseUrl()}/api/preview_file?kb_id=${datasetId}&file_name=${encodeURIComponent(fileName)}`,
  )
  const json = await res.json()
  if (!json.success) {
    const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
    return {
      type: ext as PreviewData["type"],
      content: `此文件类型的预览尚不支持 (.${ext})`,
    }
  }

  const contentType: PreviewData["type"] = json.content_type ?? "csv"

  if (contentType === "csv") {
    const content = json.content
    const headers: string[] = content.headers ?? []
    const rows: string[][] = (content.rows as Record<string, string>[] | undefined)?.map((row) =>
      headers.map((h) => row[h] ?? "")
    ) ?? []

    return {
      type: contentType,
      content: `共 ${content.total_rows} 行，显示前 ${content.displayed_rows} 行`,
      headers,
      rows,
      totalPages: Math.ceil((content.total_rows ?? 0) / (content.displayed_rows ?? 100)),
    }
  }

  return {
    type: contentType,
    content: json.content,
  }
}
