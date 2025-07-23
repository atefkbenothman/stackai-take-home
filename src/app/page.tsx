import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import Files from "@/app/components/files"

export default async function Home() {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ["files"],
    queryFn: async () => {
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
      const response = await fetch(`${baseUrl}/api/files`, {
        cache: "no-store",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch files")
      }
      return response.json()
    },
  })

  const dehydratedState = dehydrate(queryClient)

  return (
    <HydrationBoundary state={dehydratedState}>
      <Files />
    </HydrationBoundary>
  )
}
