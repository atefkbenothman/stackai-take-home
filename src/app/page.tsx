import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { FileTree } from "@/components/file-tree/file-tree"
import { FileTreeSkeleton } from "@/components/file-tree/file-tree-skeleton"
import { getFilesServer } from "@/lib/api/files-server"
import type { FilesResponse } from "@/lib/types"

export default async function Home() {
  const queryClient = new QueryClient()
  let rootData: FilesResponse | null = null

  try {
    rootData = await getFilesServer()
    await queryClient.prefetchQuery({
      queryKey: ["files"],
      queryFn: () => rootData,
    })
  } catch (error) {
    console.error("Failed to fetch root files:", error)
  }

  const dehydratedState = dehydrate(queryClient)

  return (
    <HydrationBoundary state={dehydratedState}>
      <div className="p-4">
        {rootData ? (
          <FileTree files={rootData.files} />
        ) : (
          <FileTreeSkeleton count={8} />
        )}
      </div>
    </HydrationBoundary>
  )
}
