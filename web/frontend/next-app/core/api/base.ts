const START_PORT = 5089
const MAX_TRIES = 50
const PROBE_PATH = "/api/models"

let cachedBaseUrl: string | null = null

async function probePort(port: number): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 800)
    const res = await fetch(`http://localhost:${port}${PROBE_PATH}`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok || res.status < 500
  } catch {
    return false
  }
}

export async function getBaseUrl(): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl

  for (let i = 0; i < MAX_TRIES; i++) {
    const port = START_PORT + i
    const ok = await probePort(port)
    if (ok) {
      cachedBaseUrl = `http://localhost:${port}`
      return cachedBaseUrl
    }
  }

  // 全部未命中，回退默认端口，让后续 fetch 自然报错
  cachedBaseUrl = `http://localhost:${START_PORT}`
  return cachedBaseUrl
}

export function getBaseUrlSync(): string {
  return cachedBaseUrl ?? `http://localhost:${START_PORT}`
}
