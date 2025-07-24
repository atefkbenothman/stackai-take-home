import { getAuthToken } from "@/lib/auth"

/**
 * Get organization info for the authenticated user
 */
export async function getOrgInfo(token: string) {
  const apiUrl = process.env.STACK_AI_API_URL!

  const orgResponse = await fetch(`${apiUrl}/organizations/me/current`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!orgResponse.ok) {
    throw new Error(`Failed to get organization: ${orgResponse.status}`)
  }

  return orgResponse.json()
}

/**
 * Get the Google Drive connection for the authenticated user
 */
export async function getGoogleDriveConnection(token: string) {
  const apiUrl = process.env.STACK_AI_API_URL!

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

  return connections[0]
}

/**
 * Initialize Stack AI client with authentication
 * Returns common values needed across API routes
 */
export async function initStackAIClient() {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!

  return {
    token,
    apiUrl,
    headers: { Authorization: `Bearer ${token}` },
  }
}

/**
 * Get the default indexing parameters for Knowledge Base creation
 */
export function getDefaultIndexingParams() {
  return {
    ocr: false,
    unstructured: true,
    embedding_params: {
      embedding_model: "text-embedding-ada-002",
      api_key: null,
    },
    chunker_params: {
      chunk_size: 1500,
      chunk_overlap: 500,
      chunker: "sentence",
    },
  }
}
