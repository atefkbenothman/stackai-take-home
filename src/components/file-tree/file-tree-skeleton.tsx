import { FileSkeleton } from "@/components/file-tree/file-skeleton"
import { SelectionSummary } from "@/components/file-tree/selection-summary"

export function FileTreeSkeleton() {
  return (
    <div className="rounded border bg-white shadow-sm">
      <div className="flex h-10 items-center border-b bg-gray-200 p-2">
        <h2 className="text-sm font-semibold text-gray-700">File Picker</h2>
      </div>
      <div className="h-[500px] w-full overflow-y-auto">
        {Array.from({ length: 12 }).map((_, index) => (
          <div className="h-8 border-b" key={index}>
            <div className="-mx-10 flex items-center">
              <FileSkeleton level={0} />
            </div>
          </div>
        ))}
      </div>
      <SelectionSummary allFiles={[]} />
    </div>
  )
}
