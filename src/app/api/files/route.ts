import { NextRequest, NextResponse } from "next/server"
import { getAuthToken } from "@/app/api/auth"

/*
 * This function is used to get the files from the Stack AI API.
 * It uses the auth token to authenticate the request.
 * It returns the files and the connection_id and org_id.
 */
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: "No Google Drive connection found" },
        { status: 404 },
      )
    }

    const connection = connections[0]
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")

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

    return NextResponse.json({
      files: filesData.data || [],
      connection_id: connection.connection_id,
      org_id: orgData.org_id,
    })
  } catch (error) {
    console.error("Files API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    )
  }
}
