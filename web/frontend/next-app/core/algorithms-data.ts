import type { AlgorithmCategory, Lang } from "./types"

export const CATEGORY_META: Record<AlgorithmCategory, { label: Record<Lang, string> }> = {
  centrality:      { label: { "zh-CN": "中心性分析", "en-US": "Centrality" } },
  community:       { label: { "zh-CN": "社区发现",   "en-US": "Community Detection" } },
  "shortest-path": { label: { "zh-CN": "最短路径",   "en-US": "Shortest Path" } },
  components:      { label: { "zh-CN": "连通分量",   "en-US": "Connected Components" } },
  flow:            { label: { "zh-CN": "网络流",     "en-US": "Network Flow" } },
  clustering:      { label: { "zh-CN": "聚类系数",   "en-US": "Clustering Coefficient" } },
  similarity:      { label: { "zh-CN": "相似度计算", "en-US": "Similarity" } },
  bipartite:       { label: { "zh-CN": "二分图",     "en-US": "Bipartite" } },
  traversal:       { label: { "zh-CN": "图遍历",     "en-US": "Graph Traversal" } },
  tree:            { label: { "zh-CN": "树算法",     "en-US": "Tree Algorithms" } },
  dag:             { label: { "zh-CN": "DAG算法",    "en-US": "DAG Algorithms" } },
  coloring:        { label: { "zh-CN": "图着色",     "en-US": "Graph Coloring" } },
  isomorphism:     { label: { "zh-CN": "图同构",     "en-US": "Graph Isomorphism" } },
  "link-analysis": { label: { "zh-CN": "链接分析",   "en-US": "Link Analysis" } },
  cycles:          { label: { "zh-CN": "环与桥",     "en-US": "Cycles & Bridges" } },
  matching:        { label: { "zh-CN": "图匹配",     "en-US": "Graph Matching" } },
  assortativity:   { label: { "zh-CN": "同配性",     "en-US": "Assortativity" } },
  distance:        { label: { "zh-CN": "距离度量",   "en-US": "Distance Measures" } },
  efficiency:      { label: { "zh-CN": "效率度量",   "en-US": "Efficiency Measures" } },
  operators:       { label: { "zh-CN": "图操作",     "en-US": "Graph Operators" } },
}

export function getCategoryLabel(cat: AlgorithmCategory, lang: Lang): string {
  return CATEGORY_META[cat].label[lang] ?? CATEGORY_META[cat].label["zh-CN"]
}
