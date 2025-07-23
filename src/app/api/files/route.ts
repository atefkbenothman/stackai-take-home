import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "@/lib/api/auth"
import type { FilesResponse } from "@/lib/types"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get folderId from query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")

    const token = await getAuthToken()
    const apiUrl = process.env.STACK_AI_API_URL!

    // Get organization info
    const orgResponse = await fetch(`${apiUrl}/organizations/me/current`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!orgResponse.ok) {
      throw new Error(`Failed to get organization: ${orgResponse.status}`)
    }

    const orgData = await orgResponse.json()

    // Get Google Drive connection
    const connectionResponse = await fetch(
      `${apiUrl}/connections?connection_provider=gdrive&limit=1`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!connectionResponse.ok) {
      throw new Error(`Failed to get connections: ${connectionResponse.status}`)
    }

    const connections = await connectionResponse.json()

    if (!connections || connections.length === 0) {
      throw new Error("No Google Drive connection found")
    }

    const connection = connections[0]

    // Get files/folders
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

    const response: FilesResponse = {
      files: filesData.data || [],
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
