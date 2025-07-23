import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { FileTree } from "@/app/components/file-tree"
import { getFiles } from "@/lib/api/files"
import type { FilesResponse } from "@/lib/types"

export default async function Home() {
  const queryClient = new QueryClient()
  let rootData: FilesResponse | null = null

  try {
    rootData = await getFiles()
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
          <div>Error loading files</div>
        )}
      </div>
    </HydrationBoundary>
  )
}
