interface FileTreeItemSkeletonProps {
  level?: number
  index?: number
}

export function FileTreeItemSkeleton({
  level = 0,
  index = 0,
}: FileTreeItemSkeletonProps) {
  const widths = [120, 95, 140, 80, 110, 85, 130, 100, 75, 125]
  const width = widths[index % widths.length]

  return (
    <div
      className="flex animate-pulse items-center px-2 py-1"
      style={{ paddingLeft: `${level * 26 + 8}px` }}
    >
      <div className="mr-2 h-4 w-4" />
      <div className="mr-2 h-4 w-4" />
      <div className="mr-2 h-5 w-5 rounded bg-gray-200" />
      <div className="min-w-0 flex-1">
        <div
          className="h-4 rounded bg-gray-200"
          style={{ width: `${width}px` }}
        ></div>
      </div>
    </div>
  )
}
