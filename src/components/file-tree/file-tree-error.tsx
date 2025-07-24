import { AlertCircle } from "lucide-react"
import { FileTreeHeader } from "@/components/file-tree/file-tree-header"

export function FileTreeError() {
  return (
    <div className="rounded border bg-white shadow-sm">
      <FileTreeHeader
        sortBy="name"
        onSortChange={() => {}}
        searchQuery=""
        onSearchChange={() => {}}
        filterExtension="all"
        onFilterChange={() => {}}
      />
      <div className="my-2 flex h-[500px] items-center justify-center overflow-y-auto">
        <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-gray-900">
              Unable to Load Files
            </h2>
            <p className="max-w-md text-gray-600">
              We encountered an error while trying to load your files. This
              might be due to a network issue or server problem.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
