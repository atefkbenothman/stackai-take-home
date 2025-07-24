"use client"

import { Clock, Loader2, CheckCircle, XCircle, Circle } from "lucide-react"

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

export function StatusBadge({ status }: { status: string }) {
  const config =
    STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ||
    STATUS_CONFIG["not-indexed"]
  const Icon = config.icon

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
