import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import Files from "@/app/components/files"
import { getFiles } from "@/lib/api/files"

export default async function Home() {
  const queryClient = new QueryClient()

  try {
    await queryClient.prefetchQuery({
      queryKey: ["files"],
      queryFn: async () => {
        const data = await getFiles()
        return data
      },
    })
  } catch (error) {
    console.error("Prefetch FAILED:", error)
  }

  const dehydratedState = dehydrate(queryClient)

  return (
    <HydrationBoundary state={dehydratedState}>
      <Files />
    </HydrationBoundary>
  )
}
