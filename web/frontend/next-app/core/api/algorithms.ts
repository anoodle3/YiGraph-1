// ============================================================
// 算法库 API 层
//
// 当前使用假数据。后端 API 就绪后替换 fetch 调用即可。
// ============================================================

import type { Algorithm, AlgorithmCategory, Lang } from "@/core/types"

// --- 内部双语类型 ---

interface AlgorithmRaw {
  id: string
  name: string
  category: AlgorithmCategory
  complexity: string
  chartPreference: Algorithm["chartPreference"]
  displayName: Record<Lang, string>
  summary: Record<Lang, string>
  description: Record<Lang, string>
  inputs: Record<Lang, string[]>
  outputs: Record<Lang, string[]>
  useCases: Record<Lang, string[]>
  tags: Record<Lang, string[]>
}

// --- 解析辅助 ---

function pick<T>(record: Record<Lang, T>, lang: Lang, fallback: Lang = "zh-CN"): T {
  return record[lang] ?? record[fallback]
}

function resolveAlgorithm(raw: AlgorithmRaw, lang: Lang): Algorithm {
  return {
    id: raw.id,
    name: raw.name,
    displayName: pick(raw.displayName, lang),
    category: raw.category,
    summary: pick(raw.summary, lang),
    description: pick(raw.description, lang),
    complexity: raw.complexity,
    inputs: pick(raw.inputs, lang),
    outputs: pick(raw.outputs, lang),
    useCases: pick(raw.useCases, lang),
    chartPreference: raw.chartPreference,
    tags: pick(raw.tags, lang),
  }
}

// --- 假数据（后端就绪后整块删除） ---

function zh(s: string) { return s }
function en(s: string) { return s }

const MOCK: AlgorithmRaw[] = [
  {
    id: "run_betweenness_centrality", name: "betweenness_centrality",
    category: "centrality", complexity: "O(V·E)", chartPreference: "bar",
    displayName: { "zh-CN": "介数中心性", "en-US": "Betweenness Centrality" },
    summary: { "zh-CN": zh("衡量节点作为信息桥梁的重要程度。"), "en-US": en("Measures how often a node lies on shortest paths between other nodes.") },
    description: { "zh-CN": zh("计算每个节点出现在所有点对最短路径上的比例。支持有向/无向图，可选归一化。识别网络中的关键枢纽节点。"), "en-US": en("Computes the fraction of shortest paths that pass through each node. Supports directed/undirected graphs with optional normalization. Identifies critical hub nodes in a network.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("k — 采样节点数 (int, 可选, 默认=None)"), zh("normalized — 是否归一化 (bool, 可选, 默认=True)"), zh("weight — 边权重属性名 (str, 可选, 默认=None)")], "en-US": [en("G — Graph (NetworkX graph)"), en("k — Sample nodes (int, optional, default=None)"), en("normalized — Normalize values (bool, optional, default=True)"), en("weight — Edge weight attribute (str, optional, default=None)")] },
    outputs: { "zh-CN": [zh("节点到介数值的映射字典 (dict)")], "en-US": [en("Dictionary mapping nodes to betweenness centrality values (dict)")] },
    useCases: { "zh-CN": [zh("交通枢纽识别"), zh("通信瓶颈分析"), zh("组织结构关键人")], "en-US": [en("Transportation hub identification"), en("Communication bottleneck analysis"), en("Key person detection")] },
    tags: { "zh-CN": [zh("中心性"), zh("桥接"), zh("最短路径")], "en-US": [en("centrality"), en("bridge"), en("shortest-path")] },
  },
  {
    id: "run_pagerank", name: "pagerank",
    category: "centrality", complexity: "O(k·(V+E))", chartPreference: "bar",
    displayName: { "zh-CN": "PageRank", "en-US": "PageRank" },
    summary: { "zh-CN": zh("基于链接投票机制计算节点重要度。"), "en-US": en("Computes node importance based on link voting.") },
    description: { "zh-CN": zh("通过迭代计算每个节点从邻居处获得的权重分配，反映其在整个网络的影响力。阻尼因子默认 0.85。广泛用于搜索引擎排名、推荐系统等。"), "en-US": en("Iteratively computes weight distribution from neighbors for each node, reflecting its influence across the network. Damping factor defaults to 0.85. Widely used in search ranking and recommendation systems.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("alpha — 阻尼因子 (float, 可选, 默认=0.85)"), zh("max_iter — 最大迭代次数 (int, 可选, 默认=100)"), zh("tol — 收敛容差 (float, 可选, 默认=1e-06)")], "en-US": [en("G — Graph (NetworkX graph)"), en("alpha — Damping factor (float, optional, default=0.85)"), en("max_iter — Max iterations (int, optional, default=100)"), en("tol — Convergence tolerance (float, optional, default=1e-06)")] },
    outputs: { "zh-CN": [zh("节点到 PageRank 值的映射字典 (dict)")], "en-US": [en("Dictionary mapping nodes to PageRank values (dict)")] },
    useCases: { "zh-CN": [zh("关键节点识别"), zh("网页排名"), zh("影响力营销")], "en-US": [en("Key node identification"), en("Web page ranking"), en("Influence marketing")] },
    tags: { "zh-CN": [zh("重要度"), zh("迭代"), zh("链接分析")], "en-US": [en("importance"), en("iterative"), en("link-analysis")] },
  },
  {
    id: "run_closeness_centrality", name: "closeness_centrality",
    category: "centrality", complexity: "O(V·E)", chartPreference: "bar",
    displayName: { "zh-CN": "接近中心性", "en-US": "Closeness Centrality" },
    summary: { "zh-CN": zh("衡量节点到其他所有节点的平均距离。"), "en-US": en("Measures the average distance from a node to all other nodes.") },
    description: { "zh-CN": zh("接近中心性越高，表示节点能更快接触到其他节点，适合评估信息传播能力。"), "en-US": en("Higher closeness centrality indicates faster reach to other nodes, suitable for evaluating information dissemination capability.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("distance — 边距离属性 (str, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("distance — Edge distance attribute (str, optional)")] },
    outputs: { "zh-CN": [zh("节点到接近中心性值的映射字典 (dict)")], "en-US": [en("Dictionary mapping nodes to closeness centrality values (dict)")] },
    useCases: { "zh-CN": [zh("信息传播"), zh("快速响应节点"), zh("紧急设施选址")], "en-US": [en("Information dissemination"), en("Rapid response nodes"), en("Emergency facility location")] },
    tags: { "zh-CN": [zh("中心性")], "en-US": [en("centrality")] },
  },
  {
    id: "run_louvain_communities", name: "louvain_communities",
    category: "community", complexity: "O(V·log V)", chartPreference: "pie",
    displayName: { "zh-CN": "Louvain 社区发现", "en-US": "Louvain Community Detection" },
    summary: { "zh-CN": zh("基于模块度最大化的层次化社区划分算法。"), "en-US": en("Hierarchical community detection algorithm based on modularity maximization.") },
    description: { "zh-CN": zh("贪心地合并节点形成社区，使模块度 Q 最大化。可扩展到百万级节点。"), "en-US": en("Greedily merges nodes to form communities that maximize modularity Q. Scales to millions of nodes.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("weight — 边权重属性 (str, 可选)"), zh("resolution — 分辨率参数 (float, 可选, 默认=1)")], "en-US": [en("G — Graph (NetworkX graph)"), en("weight — Edge weight attribute (str, optional)"), en("resolution — Resolution parameter (float, optional, default=1)")] },
    outputs: { "zh-CN": [zh("社区列表，每个社区为一个节点集合 (list)")], "en-US": [en("List of communities, each as a set of nodes (list)")] },
    useCases: { "zh-CN": [zh("社交圈识别"), zh("客户分群"), zh("蛋白质功能模块")], "en-US": [en("Social circle detection"), en("Customer segmentation"), en("Protein function modules")] },
    tags: { "zh-CN": [zh("社区"), zh("模块度"), zh("贪心")], "en-US": [en("community"), en("modularity"), en("greedy")] },
  },
  {
    id: "run_label_propagation_communities", name: "label_propagation_communities",
    category: "community", complexity: "O(E)", chartPreference: "pie",
    displayName: { "zh-CN": "标签传播", "en-US": "Label Propagation" },
    summary: { "zh-CN": zh("通过邻居标签多数投票发现社区。"), "en-US": en("Discovers communities through majority voting of neighbor labels.") },
    description: { "zh-CN": zh("初始为每个节点分配唯一标签，迭代采用邻居中出现最多的标签，收敛后得到社区划分。"), "en-US": en("Assigns each node a unique label initially, then iteratively adopts the most frequent label among neighbors until convergence.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)")], "en-US": [en("G — Graph (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("社区标签列表 (list)")], "en-US": [en("List of community labels (list)")] },
    useCases: { "zh-CN": [zh("在线社区检测"), zh("快速近似社区划分")], "en-US": [en("Online community detection"), en("Fast approximate community partitioning")] },
    tags: { "zh-CN": [zh("社区"), zh("传播")], "en-US": [en("community"), en("propagation")] },
  },
  {
    id: "run_dijkstra_path", name: "dijkstra_path",
    category: "shortest-path", complexity: "O((V+E)·log V)", chartPreference: "line",
    displayName: { "zh-CN": "Dijkstra 最短路径", "en-US": "Dijkstra Shortest Path" },
    summary: { "zh-CN": zh("单源非负权最短路径算法。"), "en-US": en("Single-source shortest path algorithm for non-negative weights.") },
    description: { "zh-CN": zh("使用优先队列从起点扩展最短距离节点，保证每个节点被固定时已获得最小距离。要求边权非负。"), "en-US": en("Uses a priority queue to expand from the source, guaranteeing each node receives minimal distance when finalized. Requires non-negative edge weights.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("source — 起点 (node)"), zh("target — 终点 (node)"), zh("weight — 边权重属性 (str, 可选, 默认='weight')")], "en-US": [en("G — Graph (NetworkX graph)"), en("source — Source node (node)"), en("target — Target node (node)"), en("weight — Edge weight attribute (str, optional, default='weight')")] },
    outputs: { "zh-CN": [zh("最短路径节点列表 (list)")], "en-US": [en("List of nodes on the shortest path (list)")] },
    useCases: { "zh-CN": [zh("路网导航"), zh("供应链路径"), zh("通信网络延迟分析")], "en-US": [en("Road network navigation"), en("Supply chain routing"), en("Network latency analysis")] },
    tags: { "zh-CN": [zh("最短路"), zh("贪心"), zh("优先队列")], "en-US": [en("shortest-path"), en("greedy"), en("priority-queue")] },
  },
  {
    id: "run_floyd_warshall", name: "floyd_warshall",
    category: "shortest-path", complexity: "O(V³)", chartPreference: "table",
    displayName: { "zh-CN": "Floyd-Warshall 全源最短路径", "en-US": "Floyd-Warshall All-Pairs Shortest Path" },
    summary: { "zh-CN": zh("计算所有节点对之间的最短路径。"), "en-US": en("Computes shortest paths between all pairs of nodes.") },
    description: { "zh-CN": zh("动态规划算法，适用于稠密图。支持负权边但不支持负环。"), "en-US": en("Dynamic programming algorithm suitable for dense graphs. Supports negative edges but not negative cycles.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)")], "en-US": [en("G — Graph (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("所有节点对的距离矩阵 (dict of dict)")], "en-US": [en("Distance matrix for all node pairs (dict of dict)")] },
    useCases: { "zh-CN": [zh("全网络距离"), zh("多层供应链分析")], "en-US": [en("Full network distance"), en("Multi-tier supply chain analysis")] },
    tags: { "zh-CN": [zh("全源最短路"), zh("动态规划")], "en-US": [en("all-pairs"), en("dynamic-programming")] },
  },
  {
    id: "run_connected_components", name: "connected_components",
    category: "components", complexity: "O(V+E)", chartPreference: "bar",
    displayName: { "zh-CN": "连通分量", "en-US": "Connected Components" },
    summary: { "zh-CN": zh("找出图中所有的连通分量。"), "en-US": en("Finds all connected components in a graph.") },
    description: { "zh-CN": zh("将图分解为连通子图，每个子图内的节点两两可达。支持有向图的弱连通和强连通。"), "en-US": en("Decomposes a graph into connected subgraphs where nodes are pairwise reachable. Supports weakly and strongly connected variants for directed graphs.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)")], "en-US": [en("G — Graph (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("连通分量列表 (list of set)")], "en-US": [en("List of connected components (list of set)")] },
    useCases: { "zh-CN": [zh("孤立社区发现"), zh("网络韧性分析"), zh("数据分区")], "en-US": [en("Isolated community discovery"), en("Network resilience analysis"), en("Data partitioning")] },
    tags: { "zh-CN": [zh("连通性"), zh("分量")], "en-US": [en("connectivity"), en("components")] },
  },
  {
    id: "run_maximum_flow", name: "maximum_flow",
    category: "flow", complexity: "O(V·E²)", chartPreference: "bar",
    displayName: { "zh-CN": "最大流", "en-US": "Maximum Flow" },
    summary: { "zh-CN": zh("求源到汇的最大可行流量。"), "en-US": en("Computes the maximum feasible flow from source to sink.") },
    description: { "zh-CN": zh("Edmonds–Karp 或 Dinic 算法，基于残量网络反复寻找增广路径。"), "en-US": en("Edmonds-Karp or Dinic algorithm, repeatedly finds augmenting paths on the residual network.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("s — 源节点 (node)"), zh("t — 汇节点 (node)")], "en-US": [en("G — Graph (NetworkX graph)"), en("s — Source node (node)"), en("t — Sink node (node)")] },
    outputs: { "zh-CN": [zh("最大流值 (float)"), zh("流分配字典 (dict)")], "en-US": [en("Maximum flow value (float)"), en("Flow assignment dictionary (dict)")] },
    useCases: { "zh-CN": [zh("物流规划"), zh("网络容量评估"), zh("二分图匹配")], "en-US": [en("Logistics planning"), en("Network capacity assessment"), en("Bipartite matching")] },
    tags: { "zh-CN": [zh("网络流"), zh("最大流")], "en-US": [en("network-flow"), en("max-flow")] },
  },
  {
    id: "run_minimum_cut", name: "minimum_cut",
    category: "flow", complexity: "O(V·E²)", chartPreference: "bar",
    displayName: { "zh-CN": "最小割", "en-US": "Minimum Cut" },
    summary: { "zh-CN": zh("找到图中容量最小的 s-t 割。"), "en-US": en("Finds the s-t cut with minimum capacity in a graph.") },
    description: { "zh-CN": zh("计算使源汇断开所需的最小边容量和。由最大流最小割定理保证。"), "en-US": en("Computes the minimum total edge capacity needed to disconnect source from sink. Guaranteed by the max-flow min-cut theorem.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("s — 源节点 (node)"), zh("t — 汇节点 (node)")], "en-US": [en("G — Graph (NetworkX graph)"), en("s — Source node (node)"), en("t — Sink node (node)")] },
    outputs: { "zh-CN": [zh("最小割值 (float)"), zh("割集分区 (tuple of set)")], "en-US": [en("Minimum cut value (float)"), en("Cut partition (tuple of set)")] },
    useCases: { "zh-CN": [zh("网络可靠性"), zh("图像分割"), zh("社区划分")], "en-US": [en("Network reliability"), en("Image segmentation"), en("Community partitioning")] },
    tags: { "zh-CN": [zh("网络流"), zh("最小割")], "en-US": [en("network-flow"), en("min-cut")] },
  },
  {
    id: "run_clustering", name: "clustering",
    category: "clustering", complexity: "O(V·E)", chartPreference: "bar",
    displayName: { "zh-CN": "聚类系数", "en-US": "Clustering Coefficient" },
    summary: { "zh-CN": zh("计算图的聚类系数。"), "en-US": en("Computes the clustering coefficient of a graph.") },
    description: { "zh-CN": zh("衡量图中节点的邻居之间连接的紧密程度。三角形越多，局部聚集程度越高。"), "en-US": en("Measures how tightly a node's neighbors are connected. More triangles mean higher local clustering.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("weight — 边权重属性 (str, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("weight — Edge weight attribute (str, optional)")] },
    outputs: { "zh-CN": [zh("聚类系数值 (float) 或节点到系数的映射 (dict)")], "en-US": [en("Clustering coefficient (float) or node-to-coefficient mapping (dict)")] },
    useCases: { "zh-CN": [zh("社交网络分析"), zh("小世界网络"), zh("推荐系统")], "en-US": [en("Social network analysis"), en("Small-world networks"), en("Recommendation systems")] },
    tags: { "zh-CN": [zh("聚类"), zh("三角形")], "en-US": [en("clustering"), en("triangles")] },
  },
  {
    id: "run_jaccard_coefficient", name: "jaccard_coefficient",
    category: "similarity", complexity: "O(E)", chartPreference: "scatter",
    displayName: { "zh-CN": "Jaccard 相似度", "en-US": "Jaccard Similarity" },
    summary: { "zh-CN": zh("基于邻居集合交并比的相似度度量。"), "en-US": en("Similarity measure based on intersection-over-union of neighbor sets.") },
    description: { "zh-CN": zh("J(A,B) = |N(A)∩N(B)| / |N(A)∪N(B)|，简单高效的节点相似度。"), "en-US": en("J(A,B) = |N(A)∩N(B)| / |N(A)∪N(B)|, a simple and efficient node similarity measure.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("ebunch — 节点对列表 (iterable, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("ebunch — Node pair list (iterable, optional)")] },
    outputs: { "zh-CN": [zh("节点对及其 Jaccard 分数的迭代器 (iterator)")], "en-US": [en("Iterator of node pairs and their Jaccard scores")] },
    useCases: { "zh-CN": [zh("好友推荐"), zh("链接预测"), zh("去重")], "en-US": [en("Friend recommendation"), en("Link prediction"), en("Deduplication")] },
    tags: { "zh-CN": [zh("相似度"), zh("集合"), zh("邻居")], "en-US": [en("similarity"), en("set"), en("neighbors")] },
  },
  {
    id: "run_is_bipartite", name: "is_bipartite",
    category: "bipartite", complexity: "O(V+E)", chartPreference: "table",
    displayName: { "zh-CN": "二分图检测", "en-US": "Bipartite Detection" },
    summary: { "zh-CN": zh("判断图是否为二分图。"), "en-US": en("Determines whether a graph is bipartite.") },
    description: { "zh-CN": zh("尝试对图进行二着色，若同色节点相邻则不是二分图。"), "en-US": en("Attempts to 2-color the graph; if adjacent nodes share a color, the graph is not bipartite.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)")], "en-US": [en("G — Graph (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("是否为二分图 (bool)"), zh("颜色映射 (dict, 仅当为二分图时)")], "en-US": [en("Whether bipartite (bool)"), en("Color mapping (dict, only if bipartite)")] },
    useCases: { "zh-CN": [zh("用户-商品建模"), zh("课程排课"), zh("模式分析")], "en-US": [en("User-item modeling"), en("Course scheduling"), en("Pattern analysis")] },
    tags: { "zh-CN": [zh("二分图"), zh("着色")], "en-US": [en("bipartite"), en("coloring")] },
  },
  {
    id: "run_bfs_tree", name: "bfs_tree",
    category: "traversal", complexity: "O(V+E)", chartPreference: "bar",
    displayName: { "zh-CN": "BFS 遍历树", "en-US": "BFS Tree" },
    summary: { "zh-CN": zh("从起点逐层扩展生成 BFS 树。"), "en-US": en("Generates a BFS tree by expanding layer by layer from the source.") },
    description: { "zh-CN": zh("BFS 使用队列按层次访问节点，适合在无权图上求最短跳数、探测连通分量。"), "en-US": en("BFS visits nodes layer by layer using a queue, suitable for finding shortest hops on unweighted graphs and detecting connected components.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("source — 起点 (node)")], "en-US": [en("G — Graph (NetworkX graph)"), en("source — Source node (node)")] },
    outputs: { "zh-CN": [zh("BFS 树 (DiGraph)")], "en-US": [en("BFS tree (DiGraph)")] },
    useCases: { "zh-CN": [zh("无权最短路径"), zh("连通性判定"), zh("层次结构分析")], "en-US": [en("Unweighted shortest paths"), en("Connectivity testing"), en("Hierarchy analysis")] },
    tags: { "zh-CN": [zh("遍历"), zh("队列"), zh("基础")], "en-US": [en("traversal"), en("queue"), en("fundamental")] },
  },
  {
    id: "run_dfs_tree", name: "dfs_tree",
    category: "traversal", complexity: "O(V+E)", chartPreference: "table",
    displayName: { "zh-CN": "DFS 遍历树", "en-US": "DFS Tree" },
    summary: { "zh-CN": zh("深度优先遍历生成的树。"), "en-US": en("Tree generated by depth-first traversal.") },
    description: { "zh-CN": zh("DFS 通过递归或栈对图进行深度遍历，可以发现环、强连通分量等结构。"), "en-US": en("DFS traverses a graph depth-first using recursion or a stack, capable of detecting cycles and strongly connected components.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("source — 起点 (node)")], "en-US": [en("G — Graph (NetworkX graph)"), en("source — Source node (node)")] },
    outputs: { "zh-CN": [zh("DFS 树 (DiGraph)")], "en-US": [en("DFS tree (DiGraph)")] },
    useCases: { "zh-CN": [zh("拓扑排序"), zh("环检测"), zh("桥与割点")], "en-US": [en("Topological sorting"), en("Cycle detection"), en("Bridges and articulation points")] },
    tags: { "zh-CN": [zh("遍历"), zh("递归"), zh("基础")], "en-US": [en("traversal"), en("recursion"), en("fundamental")] },
  },
  {
    id: "run_minimum_spanning_tree", name: "minimum_spanning_tree",
    category: "tree", complexity: "O(E·log V)", chartPreference: "line",
    displayName: { "zh-CN": "最小生成树", "en-US": "Minimum Spanning Tree" },
    summary: { "zh-CN": zh("找到连接所有节点的最小权重树。"), "en-US": en("Finds the minimum-weight tree connecting all nodes.") },
    description: { "zh-CN": zh("Prim 或 Kruskal 算法，在连通加权图上找到总权重最小的生成树。"), "en-US": en("Prim or Kruskal algorithm, finds a spanning tree with minimum total weight on a connected weighted graph.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("weight — 边权重属性 (str, 可选, 默认='weight')")], "en-US": [en("G — Graph (NetworkX graph)"), en("weight — Edge weight attribute (str, optional, default='weight')")] },
    outputs: { "zh-CN": [zh("最小生成树 (Graph)")], "en-US": [en("Minimum spanning tree (Graph)")] },
    useCases: { "zh-CN": [zh("网络布线"), zh("电路设计"), zh("聚类分析")], "en-US": [en("Network cabling"), en("Circuit design"), en("Cluster analysis")] },
    tags: { "zh-CN": [zh("树"), zh("最小生成树"), zh("贪心")], "en-US": [en("tree"), en("mst"), en("greedy")] },
  },
  {
    id: "run_topological_sort", name: "topological_sort",
    category: "dag", complexity: "O(V+E)", chartPreference: "table",
    displayName: { "zh-CN": "拓扑排序", "en-US": "Topological Sort" },
    summary: { "zh-CN": zh("对有向无环图进行拓扑排序。"), "en-US": en("Performs topological sort on a directed acyclic graph.") },
    description: { "zh-CN": zh("返回节点的线性顺序，使得每条有向边均从先序指向后序。仅适用于 DAG。"), "en-US": en("Returns a linear ordering of nodes where every directed edge goes from earlier to later. Only applicable to DAGs.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX DAG)")], "en-US": [en("G — Graph (NetworkX DAG)")] },
    outputs: { "zh-CN": [zh("拓扑排序节点列表 (list)")], "en-US": [en("Topologically sorted node list (list)")] },
    useCases: { "zh-CN": [zh("任务调度"), zh("依赖解析"), zh("编译顺序")], "en-US": [en("Task scheduling"), en("Dependency resolution"), en("Compilation order")] },
    tags: { "zh-CN": [zh("DAG"), zh("排序"), zh("调度")], "en-US": [en("DAG"), en("sorting"), en("scheduling")] },
  },
  {
    id: "run_greedy_color", name: "greedy_color",
    category: "coloring", complexity: "O(V+E)", chartPreference: "bar",
    displayName: { "zh-CN": "贪心图着色", "en-US": "Greedy Graph Coloring" },
    summary: { "zh-CN": zh("使用贪心策略为图节点着色。"), "en-US": en("Colors graph nodes using a greedy strategy.") },
    description: { "zh-CN": zh("按节点度降序排列后，依次为每个节点分配与邻居不冲突的最小颜色。"), "en-US": en("Orders nodes by descending degree, then assigns each the smallest color not used by its neighbors.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("strategy — 节点排序策略 (str, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("strategy — Node ordering strategy (str, optional)")] },
    outputs: { "zh-CN": [zh("节点到颜色编号的映射 (dict)")], "en-US": [en("Node to color number mapping (dict)")] },
    useCases: { "zh-CN": [zh("寄存器分配"), zh("频谱分配"), zh("排课问题")], "en-US": [en("Register allocation"), en("Spectrum assignment"), en("Course scheduling")] },
    tags: { "zh-CN": [zh("着色"), zh("贪心")], "en-US": [en("coloring"), en("greedy")] },
  },
  {
    id: "run_is_isomorphic", name: "is_isomorphic",
    category: "isomorphism", complexity: "O(V!) worst, near-linear in practice", chartPreference: "table",
    displayName: { "zh-CN": "图同构检测", "en-US": "Graph Isomorphism Detection" },
    summary: { "zh-CN": zh("判断两张图是否同构。"), "en-US": en("Determines whether two graphs are isomorphic.") },
    description: { "zh-CN": zh("检测是否存在保持邻接关系的节点双射映射。使用 VF2 算法。"), "en-US": en("Checks for a bijective node mapping that preserves adjacency. Uses the VF2 algorithm.") },
    inputs: { "zh-CN": [zh("G1 — 图1 (NetworkX graph)"), zh("G2 — 图2 (NetworkX graph)")], "en-US": [en("G1 — Graph 1 (NetworkX graph)"), en("G2 — Graph 2 (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("是否同构 (bool)")], "en-US": [en("Whether isomorphic (bool)")] },
    useCases: { "zh-CN": [zh("化学分子结构对比"), zh("社交网络对齐"), zh("模式检测")], "en-US": [en("Chemical structure comparison"), en("Social network alignment"), en("Pattern detection")] },
    tags: { "zh-CN": [zh("同构"), zh("匹配"), zh("图算法")], "en-US": [en("isomorphism"), en("matching"), en("graph-algorithm")] },
  },
  {
    id: "run_hits", name: "hits",
    category: "link-analysis", complexity: "O(k·(V+E))", chartPreference: "bar",
    displayName: { "zh-CN": "HITS 枢纽-权威分析", "en-US": "HITS Hub-Authority Analysis" },
    summary: { "zh-CN": zh("计算节点的 Hub 和 Authority 分数。"), "en-US": en("Computes Hub and Authority scores for nodes.") },
    description: { "zh-CN": zh("HITS 算法将节点分为枢纽（指向优秀权威）和权威（被优秀枢纽指向），二者相互增强。"), "en-US": en("HITS classifies nodes into hubs (pointing to good authorities) and authorities (pointed to by good hubs), each reinforcing the other.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("max_iter — 最大迭代次数 (int, 可选, 默认=100)")], "en-US": [en("G — Graph (NetworkX graph)"), en("max_iter — Max iterations (int, optional, default=100)")] },
    outputs: { "zh-CN": [zh("hub 和 authority 分数的元组 (tuple of dict)")], "en-US": [en("Tuple of hub and authority score dictionaries")] },
    useCases: { "zh-CN": [zh("网页排序"), zh("专家发现"), zh("社交影响力")], "en-US": [en("Web ranking"), en("Expert discovery"), en("Social influence")] },
    tags: { "zh-CN": [zh("链接分析"), zh("排序")], "en-US": [en("link-analysis"), en("ranking")] },
  },
  {
    id: "run_find_cycle", name: "find_cycle",
    category: "cycles", complexity: "O(V+E)", chartPreference: "table",
    displayName: { "zh-CN": "环检测", "en-US": "Cycle Detection" },
    summary: { "zh-CN": zh("在图中寻找一个环。"), "en-US": en("Finds a cycle in a graph.") },
    description: { "zh-CN": zh("使用 DFS 回溯法找到图中的第一个环。适用于有向图和无向图。"), "en-US": en("Uses DFS backtracking to find the first cycle. Works for both directed and undirected graphs.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("source — 起点 (node, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("source — Source node (node, optional)")] },
    outputs: { "zh-CN": [zh("环的边列表 (list of tuple)")], "en-US": [en("List of edges forming the cycle")] },
    useCases: { "zh-CN": [zh("死锁检测"), zh("循环依赖"), zh("金融风控")], "en-US": [en("Deadlock detection"), en("Circular dependency"), en("Financial risk control")] },
    tags: { "zh-CN": [zh("环检测"), zh("DFS")], "en-US": [en("cycle"), en("dfs")] },
  },
  {
    id: "run_max_weight_matching", name: "max_weight_matching",
    category: "matching", complexity: "O(V³)", chartPreference: "bar",
    displayName: { "zh-CN": "最大权重匹配", "en-US": "Maximum Weight Matching" },
    summary: { "zh-CN": zh("找图中无共享节点的边集，使总权重最大。"), "en-US": en("Finds a set of edges with no shared nodes that maximizes total weight.") },
    description: { "zh-CN": zh("Edmonds 开花算法在一般图上求解最大权重匹配。"), "en-US": en("Edmonds' blossom algorithm solves maximum weight matching on general graphs.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("maxcardinality — 是否在最大基数下求最大权重 (bool, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("maxcardinality — Max weight at max cardinality (bool, optional)")] },
    outputs: { "zh-CN": [zh("匹配边集合 (set of frozenset)")], "en-US": [en("Set of matched edges (set of frozenset)")] },
    useCases: { "zh-CN": [zh("任务分配"), zh("资源配对"), zh("广告匹配")], "en-US": [en("Task assignment"), en("Resource pairing"), en("Ad matching")] },
    tags: { "zh-CN": [zh("匹配"), zh("优化")], "en-US": [en("matching"), en("optimization")] },
  },
  {
    id: "run_degree_assortativity_coefficient", name: "degree_assortativity_coefficient",
    category: "assortativity", complexity: "O(E)", chartPreference: "scatter",
    displayName: { "zh-CN": "度同配系数", "en-US": "Degree Assortativity Coefficient" },
    summary: { "zh-CN": zh("量化度数相近节点之间的连接倾向。"), "en-US": en("Quantifies the tendency of nodes to connect to others with similar degree.") },
    description: { "zh-CN": zh("正值表示度相近的节点倾向于连接（同配），负值表示度不同的节点倾向于连接（异配）。"), "en-US": en("Positive values indicate degree-similar nodes tend to connect (assortative); negative values indicate degree-dissimilar nodes tend to connect (disassortative).") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)")], "en-US": [en("G — Graph (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("同配系数 (float)")], "en-US": [en("Assortativity coefficient (float)")] },
    useCases: { "zh-CN": [zh("网络韧性分析"), zh("流行病传播建模"), zh("社交网络结构研究")], "en-US": [en("Network resilience"), en("Epidemic spread modeling"), en("Social network research")] },
    tags: { "zh-CN": [zh("同配性"), zh("度相关")], "en-US": [en("assortativity"), en("degree-correlation")] },
  },
  {
    id: "run_diameter", name: "diameter",
    category: "distance", complexity: "O(V·E)", chartPreference: "bar",
    displayName: { "zh-CN": "图直径", "en-US": "Graph Diameter" },
    summary: { "zh-CN": zh("计算图的直径（最长最短路径距离）。"), "en-US": en("Computes the graph diameter (longest shortest-path distance).") },
    description: { "zh-CN": zh("图中任意两点最短路径距离的最大值，反映网络的紧密程度。"), "en-US": en("The maximum shortest-path distance between any two nodes, reflecting network compactness.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("weight — 边权重属性 (str, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("weight — Edge weight attribute (str, optional)")] },
    outputs: { "zh-CN": [zh("直径值 (int) 或节点对与距离 (tuple)")], "en-US": [en("Diameter value (int) or node pair and distance (tuple)")] },
    useCases: { "zh-CN": [zh("网络延迟评估"), zh("小世界特性分析")], "en-US": [en("Network latency evaluation"), en("Small-world property analysis")] },
    tags: { "zh-CN": [zh("距离"), zh("直径")], "en-US": [en("distance"), en("diameter")] },
  },
  {
    id: "run_global_efficiency", name: "global_efficiency",
    category: "efficiency", complexity: "O(V·E)", chartPreference: "scatter",
    displayName: { "zh-CN": "全局效率", "en-US": "Global Efficiency" },
    summary: { "zh-CN": zh("衡量网络的信息传输效率。"), "en-US": en("Measures the information transmission efficiency of a network.") },
    description: { "zh-CN": zh("所有节点对最短路径倒数的平均值，反映网络整体传输效率。对小世界网络诊断有重要意义。"), "en-US": en("The average of inverse shortest-path distances over all node pairs, reflecting overall network transmission efficiency. Important for small-world network diagnosis.") },
    inputs: { "zh-CN": [zh("G — 图 (NetworkX graph)"), zh("weight — 边权重属性 (str, 可选)")], "en-US": [en("G — Graph (NetworkX graph)"), en("weight — Edge weight attribute (str, optional)")] },
    outputs: { "zh-CN": [zh("全局效率 (float)")], "en-US": [en("Global efficiency (float)")] },
    useCases: { "zh-CN": [zh("脑网络分析"), zh("交通系统效率"), zh("通信网络优化")], "en-US": [en("Brain network analysis"), en("Transportation efficiency"), en("Communication network optimization")] },
    tags: { "zh-CN": [zh("效率"), zh("小世界")], "en-US": [en("efficiency"), en("small-world")] },
  },
  {
    id: "run_cartesian_product", name: "cartesian_product",
    category: "operators", complexity: "O(V1·V2·(E1+E2))", chartPreference: "table",
    displayName: { "zh-CN": "图的笛卡尔积", "en-US": "Graph Cartesian Product" },
    summary: { "zh-CN": zh("计算两张图的笛卡尔积。"), "en-US": en("Computes the Cartesian product of two graphs.") },
    description: { "zh-CN": zh("生成新图，其节点为原图节点对的笛卡尔积，边在某一维邻居相同时连接。"), "en-US": en("Generates a new graph whose nodes are Cartesian pairs of original nodes, with edges connecting pairs that differ in one dimension by adjacency.") },
    inputs: { "zh-CN": [zh("G — 图1 (NetworkX graph)"), zh("H — 图2 (NetworkX graph)")], "en-US": [en("G — Graph 1 (NetworkX graph)"), en("H — Graph 2 (NetworkX graph)")] },
    outputs: { "zh-CN": [zh("笛卡尔积图 (Graph)")], "en-US": [en("Cartesian product graph (Graph)")] },
    useCases: { "zh-CN": [zh("多维网络建模"), zh("并行计算拓扑"), zh("网格生成")], "en-US": [en("Multi-dimensional network modeling"), en("Parallel computing topology"), en("Grid generation")] },
    tags: { "zh-CN": [zh("图操作"), zh("笛卡尔积")], "en-US": [en("operators"), en("cartesian-product")] },
  },
]

// --- 分类标签 ---

const CAT_LABEL: Record<string, Record<Lang, string>> = {
  centrality:      { "zh-CN": "中心性分析", "en-US": "Centrality" },
  community:       { "zh-CN": "社区发现",   "en-US": "Community Detection" },
  "shortest-path": { "zh-CN": "最短路径",   "en-US": "Shortest Path" },
  components:      { "zh-CN": "连通分量",   "en-US": "Connected Components" },
  flow:            { "zh-CN": "网络流",     "en-US": "Network Flow" },
  clustering:      { "zh-CN": "聚类系数",   "en-US": "Clustering Coefficient" },
  similarity:      { "zh-CN": "相似度计算", "en-US": "Similarity" },
  bipartite:       { "zh-CN": "二分图",     "en-US": "Bipartite" },
  traversal:       { "zh-CN": "图遍历",     "en-US": "Graph Traversal" },
  tree:            { "zh-CN": "树算法",     "en-US": "Tree Algorithms" },
  dag:             { "zh-CN": "DAG算法",    "en-US": "DAG Algorithms" },
  coloring:        { "zh-CN": "图着色",     "en-US": "Graph Coloring" },
  isomorphism:     { "zh-CN": "图同构",     "en-US": "Graph Isomorphism" },
  "link-analysis": { "zh-CN": "链接分析",   "en-US": "Link Analysis" },
  cycles:          { "zh-CN": "环与桥",     "en-US": "Cycles & Bridges" },
  matching:        { "zh-CN": "图匹配",     "en-US": "Graph Matching" },
  assortativity:   { "zh-CN": "同配性",     "en-US": "Assortativity" },
  distance:        { "zh-CN": "距离度量",   "en-US": "Distance Measures" },
  efficiency:      { "zh-CN": "效率度量",   "en-US": "Efficiency Measures" },
  operators:       { "zh-CN": "图操作",     "en-US": "Graph Operators" },
}

// --- API 函数 ---

export interface CategoryInfo {
  id: AlgorithmCategory
  label: string
  count: number
}

export async function fetchAlgorithms(params: {
  search?: string
  category?: string
  lang?: Lang
}): Promise<{ data: Algorithm[]; total: number }> {
  // TODO: 替换为真实 fetch
  const { search = "", category = "", lang = "zh-CN" } = params
  const q = search.trim().toLowerCase()
  const filtered = MOCK.filter((raw) => {
    if (category && raw.category !== category) return false
    if (!q) return true
    return (
      raw.name.toLowerCase().includes(q) ||
      raw.displayName["zh-CN"].toLowerCase().includes(q) ||
      raw.displayName["en-US"].toLowerCase().includes(q) ||
      raw.tags["zh-CN"].some((t) => t.toLowerCase().includes(q)) ||
      raw.tags["en-US"].some((t) => t.toLowerCase().includes(q))
    )
  })
  return { data: filtered.map((r) => resolveAlgorithm(r, lang)), total: filtered.length }
}

export async function fetchCategories(params?: { lang?: Lang }): Promise<CategoryInfo[]> {
  const lang = params?.lang ?? "zh-CN"
  const map = new Map<string, number>()
  for (const raw of MOCK) {
    map.set(raw.category, (map.get(raw.category) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([id, count]) => ({
    id: id as AlgorithmCategory,
    label: CAT_LABEL[id]?.[lang] ?? id,
    count,
  }))
}

export async function createAlgorithm(input: Omit<Algorithm, "id">): Promise<Algorithm> {
  // TODO: 替换为真实 fetch
  const algorithm: Algorithm = {
    ...input,
    id: `run_${input.name}`,
  }
  // Push to mock as AlgorithmRaw for demo purposes
  const raw: AlgorithmRaw = {
    id: algorithm.id,
    name: algorithm.name,
    category: algorithm.category,
    complexity: algorithm.complexity,
    chartPreference: algorithm.chartPreference,
    displayName: { "zh-CN": algorithm.displayName, "en-US": algorithm.displayName },
    summary: { "zh-CN": algorithm.summary, "en-US": algorithm.summary },
    description: { "zh-CN": algorithm.description, "en-US": algorithm.description },
    inputs: { "zh-CN": algorithm.inputs, "en-US": algorithm.inputs },
    outputs: { "zh-CN": algorithm.outputs, "en-US": algorithm.outputs },
    useCases: { "zh-CN": algorithm.useCases, "en-US": algorithm.useCases },
    tags: { "zh-CN": algorithm.tags, "en-US": algorithm.tags },
  }
  MOCK.unshift(raw)
  return algorithm
}

export async function getAlgorithmById(id: string, lang?: Lang): Promise<Algorithm | undefined> {
  const raw = MOCK.find((a) => a.id === id)
  return raw ? resolveAlgorithm(raw, lang ?? "zh-CN") : undefined
}
