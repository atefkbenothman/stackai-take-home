interface FileTreeItemSkeletonProps {
  level?: number
}

export function FileTreeItemSkeleton({ level = 0 }: FileTreeItemSkeletonProps) {
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
          style={{
            width: `${Math.floor(Math.random() * 80 + 60)}px`,
          }}
        ></div>
      </div>
    </div>
  )
}
