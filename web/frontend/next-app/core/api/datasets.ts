import type { Dataset, PaginatedResponse } from "@/core/types"
import { getBaseUrl } from "./base"

interface BackendDataset {
  id: number
  name: string
  file_type: "text" | "graph"
  file_count: number
  created_at: string
}

function toDataset(b: BackendDataset): Dataset {
  return {
    id: String(b.id),
    name: b.name,
    fileType: b.file_type === "graph" ? "graph-data" : "raw-data",
    fileCount: b.file_count,
    createdAt: b.created_at,
  }
}

export async function getDatasets(
  search = "",
  page = 1,
  pageSize = 8,
): Promise<PaginatedResponse<Dataset>> {
  const res = await fetch(`${await getBaseUrl()}/api/knowledge_bases`)
  const json = await res.json()
  if (!json.success) throw new Error("获取数据集列表失败")

  const all: Dataset[] = (json.data as BackendDataset[]).map(toDataset)

  const q = search.trim().toLowerCase()
  const filtered = q ? all.filter((d) => d.name.toLowerCase().includes(q)) : all
  const total = filtered.length
  const start = (page - 1) * pageSize
  const data = filtered.slice(start, start + pageSize)
  return { data, total, page, pageSize }
}

export async function createDataset(input: {
  name: string
  fileType: Dataset["fileType"]
}): Promise<Dataset> {
  const res = await fetch(`${await getBaseUrl()}/api/knowledge_bases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      file_type: input.fileType === "graph-data" ? "graph" : "text",
    }),
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "创建数据集失败")

  return {
    id: String(Date.now()),
    name: input.name,
    fileType: input.fileType,
    fileCount: 0,
    createdAt: new Date().toISOString(),
  }
}

export async function deleteDataset(id: string): Promise<void> {
  const res = await fetch(`${await getBaseUrl()}/api/knowledge_bases/${id}`, {
    method: "DELETE",
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error ?? "删除数据集失败")
}
