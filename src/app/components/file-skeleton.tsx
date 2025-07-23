interface FileSkeletonProps {
  level?: number
  count?: number
}

export function FileSkeleton({ level = 0, count = 1 }: FileSkeletonProps) {
  return (
    <div>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex animate-pulse items-center px-2 py-1"
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {/* Empty space for toggle icon */}
          <div className="mr-2 h-4 w-4"></div>

          {/* File/folder icon skeleton - matches actual icon size */}
          <div className="mr-2 h-5 w-5 rounded bg-gray-200"></div>

          {/* Name skeleton - varied width to look more natural */}
          <div
            className="h-4 rounded bg-gray-200"
            style={{
              width: `${Math.floor(Math.random() * 80 + 60)}px`, // Random width between 60-140px
            }}
          ></div>
        </div>
      ))}
    </div>
  )
}
