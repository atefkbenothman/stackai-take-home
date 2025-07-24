import { FileSkeleton } from "@/components/file-tree/file-skeleton"
import { SelectionSummary } from "@/components/file-tree/selection-summary"

interface FileTreeSkeletonProps {
  count?: number
}

export function FileTreeSkeleton({ count = 8 }: FileTreeSkeletonProps) {
  return (
    <div className="rounded border bg-white shadow-sm">
      <div className="flex h-10 items-center border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">File Picker</h2>
      </div>
      <div className="-mx-10 my-2 h-[500px] overflow-y-auto">
        <FileSkeleton level={0} count={count} />
      </div>
      <SelectionSummary allFiles={[]} />
    </div>
  )
}
