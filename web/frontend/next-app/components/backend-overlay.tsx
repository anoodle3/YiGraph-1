"use client"

import { ServerCrash, LoaderCircle } from "lucide-react"
import { useI18n } from "@/core/i18n/i18n-provider"
import { useBackendStatus } from "@/hooks/use-backend-status"

/** 后端服务未就绪时覆盖全屏的遮罩，后端上线后自动消失。 */
export function BackendOverlay() {
  const { status, failures, everOnline } = useBackendStatus()
  const { t } = useI18n()

  // 后端未确认在线（含首次探测中）即显示遮罩，第一帧就出现
  if (status === "online") return null

  // 从未连上：视为后端启动中；启动一段时间后仍失败则提示检查后端
  const starting = !everOnline && failures <= 2
  const title = starting
    ? t("backend.startingTitle", "后端服务启动中")
    : everOnline
      ? t("backend.reconnectingTitle", "后端连接已断开")
      : t("backend.unreachableTitle", "无法连接后端服务")
  const desc = starting
    ? t("backend.startingDesc", "正在等待后端服务就绪，请稍候…")
    : everOnline
      ? t("backend.reconnectingDesc", "正在尝试重新连接…")
      : t("backend.unreachableDesc", "请确认后端服务已启动，前端将自动重试连接。")

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card px-10 py-8 shadow-lg">
        <div className="relative">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
          {!starting && (
            <ServerCrash className="absolute -bottom-1 -right-1 size-5 rounded-full bg-card p-0.5 text-destructive" />
          )}
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="max-w-xs text-sm text-muted-foreground">{desc}</p>
        </div>
      </div>
    </div>
  )
}
