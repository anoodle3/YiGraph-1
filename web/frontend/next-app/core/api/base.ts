const START_PORT = 5089
const PROBE_PATH = "/api/health"
const STORAGE_KEY = "yigraph_base_url"
const FALLBACK_URL = `http://localhost:${START_PORT}`
/** 快路径失败时每次探测分批轮扫的端口数，全范围（49 个）约每 5 次探测覆盖一轮 */
const SCAN_BATCH = 10
/** 连续失败多少次才判定后端离线（与遮罩的判定一致） */
const LIVE_FAILURE_THRESHOLD = 2

let cachedBaseUrl: string | null = null
let pendingPromise: Promise<string> | null = null
let probeCount = 0
let scanCursor = 1
let consecutiveFailures = 0
let backendLive = false
let liveWaiters: Array<() => void> = []
/**
 * 同源模式：页面由后端托管（单端口形态），一切请求走相对路径。
 * 置位后 getBaseUrl 恒返回 ""，端口扫描不再执行。
 */
let sameOriginVerified = false

async function probePort(port: number, timeoutMs = 500): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(`http://localhost:${port}${PROBE_PATH}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return true
  } catch {
    return false
  }
}

/** 探测同源后端：页面由后端托管（单端口形态）时 /api/health 同源可达。 */
async function probeSameOrigin(timeoutMs = 600): Promise<boolean> {
  if (typeof window === "undefined") return false
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(PROBE_PATH, {
      signal: controller.signal,
      cache: "no-store",
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

/** 扫描可用端口，找到返回其 base URL，未找到返回 null。 */
async function findBaseUrl(): Promise<string | null> {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const port = parseInt(stored, 10)
      if (!isNaN(port) && (await probePort(port, 300))) {
        return `http://localhost:${port}`
      }
    }
  } catch { /* sessionStorage might be unavailable */ }

  for (let i = 0; i < 50; i++) {
    const port = START_PORT + i
    if (await probePort(port)) {
      try { sessionStorage.setItem(STORAGE_KEY, String(port)) } catch { /* */ }
      return `http://localhost:${port}`
    }
  }

  return null
}

function setBackendLive(live: boolean) {
  if (live === backendLive) return
  backendLive = live
  if (live) {
    // 唤醒所有等待后端上线的 getBaseUrl 调用
    const waiters = liveWaiters
    liveWaiters = []
    for (const w of waiters) w()
  } else {
    // 后端掉线：后续 getBaseUrl 需要重新等待上线
    pendingPromise = null
  }
}

function waitForBackendLive(): Promise<void> {
  if (backendLive) return Promise.resolve()
  return new Promise((resolve) => liveWaiters.push(resolve))
}

function cacheBaseUrl(port: number): string {
  try { sessionStorage.setItem(STORAGE_KEY, String(port)) } catch { /* */ }
  const url = `http://localhost:${port}`
  cachedBaseUrl = url
  return url
}

export async function getBaseUrl(): Promise<string> {
  if (sameOriginVerified) return ""
  if (!pendingPromise) {
    pendingPromise = (async () => {
      // 单端口形态：页面由后端托管，同源直连，无需端口扫描
      if (await probeSameOrigin()) {
        sameOriginVerified = true
        cachedBaseUrl = ""
        setBackendLive(true)
        return ""
      }
      // 双端口形态（dev）：同源探测失败（:3000 上没有 /api/health）→ 端口扫描定位后端
      const url = await findBaseUrl()
      if (url) {
        setBackendLive(true)
        return url
      }
      setBackendLive(false)
      // 后端未上线：等待探测发现后端（遮罩的轮询会持续探测并通知），
      // 期间不向后端发起注定失败的请求
      await waitForBackendLive()
      return cachedBaseUrl ?? FALLBACK_URL
    })().then((url) => {
      // 不覆盖并发探测（probeBackend）已写入的新地址
      if (!cachedBaseUrl) cachedBaseUrl = url
      return cachedBaseUrl
    })
  }
  return pendingPromise
}

/**
 * 探测后端是否可达。可达时返回其 base URL（同源模式为 ""）并更新缓存，
 * 否则返回 null。由启动遮罩轮询使用。
 * 探测顺序：同源 /api/health → 上次使用的端口 / 起始端口 → 分批轮扫。
 */
export async function probeBackend(timeoutMs = 400): Promise<string | null> {
  probeCount += 1

  // 同源优先：单端口形态下页面与后端同源，无需扫描
  if (await probeSameOrigin(timeoutMs)) {
    if (!sameOriginVerified) {
      sameOriginVerified = true
      cachedBaseUrl = ""
    }
    consecutiveFailures = 0
    setBackendLive(true)
    return ""
  }

  let found: number | null = null
  try {
    const stored = parseInt(sessionStorage.getItem(STORAGE_KEY) ?? "", 10)
    if (!isNaN(stored) && (await probePort(stored, timeoutMs))) found = stored
  } catch { /* sessionStorage might be unavailable */ }
  if (found === null && (await probePort(START_PORT, timeoutMs))) {
    found = START_PORT
  }

  if (found === null) {
    if (probeCount === 1) {
      // 首次探测：全量扫描
      for (let i = 1; i < 50; i++) {
        const port = START_PORT + i
        if (await probePort(port, timeoutMs)) {
          found = port
          break
        }
      }
    } else {
      // 分批轮扫：每次推进 SCAN_BATCH 个端口
      for (let k = 0; k < SCAN_BATCH; k++) {
        const port = START_PORT + scanCursor
        scanCursor = scanCursor >= 49 ? 1 : scanCursor + 1
        if (await probePort(port, timeoutMs)) {
          found = port
          break
        }
      }
    }
  }

  if (found === null) {
    consecutiveFailures += 1
    if (consecutiveFailures >= LIVE_FAILURE_THRESHOLD) setBackendLive(false)
    return null
  }
  consecutiveFailures = 0
  const url = cacheBaseUrl(found)
  setBackendLive(true)
  return url
}

export function getBaseUrlSync(): string {
  return cachedBaseUrl ?? FALLBACK_URL
}
