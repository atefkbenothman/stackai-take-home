import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <FileTreeSkeleton count={10} />
      </div>
    </div>
  )
}
