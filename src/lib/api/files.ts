import type { FilesResponse } from "@/lib/types"

/*
 * Client-side function to get files from Stack AI API via Next.js API route
 * This enables parallel prefetch requests and proper server-side credential handling
 */
export async function getFiles(folderId?: string): Promise<FilesResponse> {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"

    const url = `${baseUrl}/api/files${folderId ? `?folderId=${folderId}` : ""}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`)
    }

    const data: FilesResponse = await response.json()
    return data
  } catch (error) {
    console.error("Client files fetch error:", error)
    throw error
  }
}
