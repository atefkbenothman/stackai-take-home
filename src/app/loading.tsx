import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"

export default function Loading() {
  return (
    <div className="p-4">
      <FileTreeSkeleton count={10} />
    </div>
  )
}
