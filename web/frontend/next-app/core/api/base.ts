const START_PORT = 5089
const PROBE_PATH = "/api/health"
const STORAGE_KEY = "yigraph_base_url"

let cachedBaseUrl: string | null = null
let pendingPromise: Promise<string> | null = null

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

async function findBaseUrl(): Promise<string> {
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

  return `http://localhost:${START_PORT}`
}

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl
  if (!pendingPromise) {
    pendingPromise = findBaseUrl().then((url) => {
      cachedBaseUrl = url
      return url
    })
  }
  return pendingPromise
}

export function getBaseUrlSync(): string {
  return cachedBaseUrl ?? `http://localhost:${START_PORT}`
}
