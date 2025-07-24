"use client"

import { Clock, Loader2, CheckCircle, XCircle, Circle, X } from "lucide-react"
import type { FileItem } from "@/lib/types"

const STATUS_CONFIG = {
  pending: {
    icon: Clock,
    text: "Pending",
    className: "bg-yellow-100 text-yellow-800",
  },
  indexing: {
    icon: Loader2,
    text: "Indexing",
    className: "bg-blue-100 text-blue-800",
    iconClassName: "animate-spin",
  },
  indexed: {
    icon: CheckCircle,
    text: "Indexed",
    className: "bg-green-100 text-green-800",
  },
  error: {
    icon: XCircle,
    text: "Error",
    className: "bg-red-100 text-red-800",
  },
  "not-indexed": {
    icon: Circle,
    text: "Not Indexed",
    className: "bg-gray-100 text-gray-800",
  },
} as const

interface StatusBadgeProps {
  status: string
  file?: FileItem
  onDeindex?: (file: FileItem) => void
}

export function StatusBadge({ status, file, onDeindex }: StatusBadgeProps) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG["not-indexed"]
  const Icon = config.icon

  const canDeindex = status === "indexed" && file?.kbResourceId && onDeindex

  if (canDeindex) {
    return (
      <span
        className={`group inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors ${config.className}`}
        onClick={(e) => {
          e.stopPropagation()
          onDeindex(file)
        }}
        title="Click to remove from index"
      >
        <Icon
          size={12}
          className={"iconClassName" in config ? config.iconClassName : ""}
        />
        {config.text}
        <X size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon
        size={12}
        className={"iconClassName" in config ? config.iconClassName : ""}
      />
      {config.text}
    </span>
  )
}
