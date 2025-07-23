import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import Files from "@/app/components/files"

export default async function Home() {
  const queryClient = new QueryClient()

  console.log("🔍 Starting server-side prefetch...")

  try {
    await queryClient.prefetchQuery({
      queryKey: ["files"],
      queryFn: async () => {
        const baseUrl = process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000"

        const url = `${baseUrl}/api/files`
        console.log("🔍 Server fetching from:", url)

        const response = await fetch(url, {
          cache: "no-store",
        })

        console.log("🔍 Server response status:", response.status)

        if (!response.ok) {
          console.error("🔍 Server fetch failed:", await response.text())
          throw new Error(`Server fetch failed: ${response.status}`)
        }

        const data = await response.json()
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
