import { NextRequest, NextResponse } from "next/server"
import {
  initStackAIClient,
  getOrgInfo,
  getGoogleDriveConnection,
} from "@/lib/stack-ai"
import type { FilesResponse, FileItem, RawFileFromAPI } from "@/lib/types"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get folderId from query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId") || undefined

    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Get organization info
    const orgData = await getOrgInfo(token)

    // Get Google Drive connection
    const connection = await getGoogleDriveConnection(token)

    // Get files/folders from Stack AI
    let filesUrl = `${apiUrl}/connections/${connection.connection_id}/resources/children`
    if (folderId) {
      filesUrl += `?resource_id=${folderId}`
    }

    const filesResponse = await fetch(filesUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!filesResponse.ok) {
      throw new Error(`Failed to get files: ${filesResponse.status}`)
    }

    const filesData = await filesResponse.json()

    // Transform response data
    const files = (filesData.data || []).map(
      (file: RawFileFromAPI): FileItem => ({
        ...file,
        parentId: folderId, // Set parentId to the folder we're fetching from
      }),
    )

    const response: FilesResponse = {
      files,
      connection_id: connection.connection_id,
      org_id: orgData.org_id,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("API files fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    )
  }
}
