"use server"

import { getAuthToken } from "@/lib/api/auth"

interface FileItem {
  resource_id: string
  inode_type: "directory" | "file"
  inode_path: {
    path: string
  }
  created_at: string
  modified_at: string
  dataloader_metadata?: {
    size?: number
    content_mime?: string
    web_url?: string
  }
}

interface FilesResponse {
  files: FileItem[]
  connection_id: string
  org_id: string
}

/*
 * Server-side function to get files from Stack AI API
 * This function bypasses HTTP layer and directly calls Stack AI APIs
 */
export async function getFiles(folderId?: string): Promise<FilesResponse> {
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

    return {
      files: filesData.data || [],
      connection_id: connection.connection_id,
      org_id: orgData.org_id,
    }
  } catch (error) {
    console.error("Server files fetch error:", error)
    throw error
  }
}
