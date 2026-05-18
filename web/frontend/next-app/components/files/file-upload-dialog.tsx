"use client"

import * as React from "react"
import { Upload, X, File, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { useI18n } from "@/core/i18n/i18n-provider"
import { formatSize } from "@/core/utils"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (files: File[], config: {
    graphName?: string
    vertexLabelField?: string
    edgeSourceField?: string
    edgeTargetField?: string
  }) => Promise<void>
  isGraphDataset: boolean
}

export function FileUploadDialog({ open, onOpenChange, onUpload, isGraphDataset }: Props) {
  const { t } = useI18n()
  const [files, setFiles] = React.useState<File[]>([])
  const [uploading, setUploading] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [graphExpanded, setGraphExpanded] = React.useState(isGraphDataset)
  const [graphName, setGraphName] = React.useState("")
  const [vertexLabelField, setVertexLabelField] = React.useState("")
  const [edgeSourceField, setEdgeSourceField] = React.useState("")
  const [edgeTargetField, setEdgeTargetField] = React.useState("")
  const [dragOver, setDragOver] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setFiles([])
      setProgress(0)
      setGraphName("")
      setVertexLabelField("")
      setEdgeSourceField("")
      setEdgeTargetField("")
      setGraphExpanded(isGraphDataset)
    }
  }, [open, isGraphDataset])

  const addFiles = (fileList: FileList | null) => {
    if (!fileList) return
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name))
      const incoming: File[] = []
      for (let i = 0; i < fileList.length; i++) {
        if (!existing.has(fileList[i].name)) incoming.push(fileList[i])
      }
      return [...prev, ...incoming]
    })
  }

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name))
  }

  const handleSubmit = async () => {
    if (files.length === 0) return
    setUploading(true)
    setProgress(0)
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90))
    }, 150)
    await onUpload(files, {
      graphName: graphName || undefined,
      vertexLabelField: vertexLabelField || undefined,
      edgeSourceField: edgeSourceField || undefined,
      edgeTargetField: edgeTargetField || undefined,
    })
    clearInterval(timer)
    setProgress(100)
    setTimeout(() => {
      setUploading(false)
      onOpenChange(false)
    }, 500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("files.uploadTitle", "上传文件")}</DialogTitle>
          <DialogDescription>
            {isGraphDataset ? t("files.uploadDescGraph", "支持拖拽上传，一次可选择多个文件。图数据集请至少上传节点文件和边文件。") : t("files.uploadDesc", "支持拖拽上传，一次可选择多个文件。")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div
            className={[
              "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25",
            ].join(" ")}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addFiles(e.dataTransfer.files)
            }}
          >
            <Upload className="size-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {t("files.dragDrop", "拖拽文件到此处，或点击下方按钮")}
            </span>
            <label>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <span>
                  <File className="size-4" />
                  {t("files.browseFiles", "浏览文件")}
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                multiple
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
          </div>

          {files.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                {t("files.selectedFiles", "已选择 {count} 个文件").replace("{count}", String(files.length))}
              </span>
              <div className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
                  >
                    <File className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatSize(f.size)}
                    </span>
                    <button
                      onClick={() => removeFile(f.name)}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive"
                      disabled={uploading}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {uploading && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                {t("files.uploading", "上传中...")} {progress}%
              </span>
              <Progress value={progress} />
            </div>
          )}

          {isGraphDataset && (
            <div className="rounded-lg border">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium"
                onClick={() => setGraphExpanded(!graphExpanded)}
              >
                <span>{t("files.graphConfig", "图信息配置")}</span>
                {graphExpanded ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
              {graphExpanded && (
                <div className="flex flex-col gap-3 border-t px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t("files.graphName", "图名称")}</Label>
                    <Input
                      value={graphName}
                      onChange={(e) => setGraphName(e.target.value)}
                      placeholder={t("files.graphNamePlaceholder", "输入图名称")}
                      className="h-8 text-sm"
                      disabled={uploading}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t("files.vertexLabel", "顶点标签字段")}</Label>
                    <Input
                      value={vertexLabelField}
                      onChange={(e) => setVertexLabelField(e.target.value)}
                      placeholder={t("files.vertexLabelPlaceholder", "顶点CSV中作为标签的列名")}
                      className="h-8 text-sm"
                      disabled={uploading}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t("files.edgeSource", "边源节点字段")}</Label>
                    <Input
                      value={edgeSourceField}
                      onChange={(e) => setEdgeSourceField(e.target.value)}
                      placeholder={t("files.edgeSourcePlaceholder", "边CSV中源节点的列名")}
                      className="h-8 text-sm"
                      disabled={uploading}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs">{t("files.edgeTarget", "边目标节点字段")}</Label>
                    <Input
                      value={edgeTargetField}
                      onChange={(e) => setEdgeTargetField(e.target.value)}
                      placeholder={t("files.edgeTargetPlaceholder", "边CSV中目标节点的列名")}
                      className="h-8 text-sm"
                      disabled={uploading}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={uploading}
          >
            {t("files.cancel", "取消")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
            className="gap-2"
          >
            <Upload className="size-4" />
            {uploading ? t("files.uploading", "上传中...") : t("files.upload", "上传")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
