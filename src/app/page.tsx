import { Suspense } from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { FileTree } from "@/components/file-tree/file-tree"
import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"
import { getFilesServer } from "@/lib/api/files-server"
import { FileTreeError } from "@/components/file-tree/file-tree-error"

async function FileTreeData() {
  const queryClient = new QueryClient()

  try {
    const rootData = await getFilesServer()
    await queryClient.prefetchQuery({
      queryKey: ["files"],
      queryFn: () => rootData,
    })

    const dehydratedState = dehydrate(queryClient)

    return (
      <HydrationBoundary state={dehydratedState}>
        <FileTree />
      </HydrationBoundary>
    )
  } catch {
    return <FileTreeError />
  }
}

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <Suspense fallback={<FileTreeSkeleton />}>
          <FileTreeData />
        </Suspense>
      </div>
    </div>
  )
}
