import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import Files from "@/app/components/files"
import { getFiles } from "@/lib/api/files"

export default async function Home() {
  const queryClient = new QueryClient()

  console.log("🔍 Starting server-side prefetch...")

  try {
    await queryClient.prefetchQuery({
      queryKey: ["files"],
      queryFn: async () => {
        console.log("🔍 Server prefetch using direct function call...")
        const data = await getFiles()
        console.log("🔍 Server prefetch SUCCESS, files:", data.files?.length)
        return data
      },
    })

    console.log("🔍 Prefetch completed successfully")
  } catch (error) {
    console.error("🔍 Prefetch FAILED:", error)
  }

  const dehydratedState = dehydrate(queryClient)
  console.log("🔍 Dehydrated state:", !!dehydratedState)

  return (
    <HydrationBoundary state={dehydratedState}>
      <Files />
    </HydrationBoundary>
  )
}
