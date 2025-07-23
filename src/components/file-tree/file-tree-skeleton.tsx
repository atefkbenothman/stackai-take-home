import { FileSkeleton } from "@/components/file-tree/file-skeleton"

interface FileTreeSkeletonProps {
  count?: number
}

export function FileTreeSkeleton({ count = 8 }: FileTreeSkeletonProps) {
  return (
    <div className="border bg-white">
      <div className="border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">Files</h2>
      </div>
      <div className="-mx-4 max-h-96 overflow-y-auto py-2">
        <FileSkeleton level={0} count={count} />
      </div>
    </div>
  )
}
