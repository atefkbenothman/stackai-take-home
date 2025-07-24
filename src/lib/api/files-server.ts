"use server"

import { getAuthToken } from "@/app/api/auth"
import type { FilesResponse } from "@/lib/types"

/*
 * Server-side function to get files from Stack AI API
 * This bypasses HTTP requests and calls the API directly from the server
 */
export async function getFilesServer(
  folderId?: string,
): Promise<FilesResponse> {
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

  return response
}
