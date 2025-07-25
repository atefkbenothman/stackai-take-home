import type {
  FilesResponse,
  KnowledgeBase,
  KBStatusResponse,
  CreateKnowledgeBaseRequest,
  RawFileFromAPI,
  FileItem,
} from "@/lib/types"

interface AuthInfo {
  token: string
  expires_in: number
  org_id: string
  connection_id: string
}

const DEFAULT_INDEXING_PARAMS = {
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
} as const

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

let authInfo: AuthInfo | null = null
let expiresAt = 0

const apiUrl = process.env.NEXT_PUBLIC_STACK_AI_API_URL

if (!apiUrl) {
  throw new Error(
    "NEXT_PUBLIC_STACK_AI_API_URL environment variable is required for client-side Stack AI API calls",
  )
}

/** Get valid authentication token and connection info (cached) */
async function getAuthInfo(): Promise<AuthInfo> {
  if (authInfo && Date.now() < expiresAt - 60000) {
    return authInfo
  }

  const response = await fetch("/api/auth/token")

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Authentication failed: ${error}`)
  }

  const newAuthInfo: AuthInfo = await response.json()
  authInfo = newAuthInfo
  expiresAt = Date.now() + newAuthInfo.expires_in * 1000
  return newAuthInfo
}

export async function fetchFiles(folderId?: string): Promise<FilesResponse> {
  const info = await getAuthInfo()
  let endpoint = `/connections/${info.connection_id}/resources/children`
  if (folderId) endpoint += `?resource_id=${folderId}`

  const response = await fetch(`${apiUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${info.token}` },
  })

  if (!response.ok) throw new Error(`Failed to fetch files: ${response.status}`)

  const data = await response.json()
  const files = (data.data || []).map(
    (file: RawFileFromAPI): FileItem => ({ ...file, parentId: folderId }),
  )
  return { files, connection_id: info.connection_id, org_id: info.org_id }
}

export async function createKnowledgeBase(
  _connectionId: string, // kept for backward compatibility
  selectedResourceIds: string[],
  name: string,
  description: string,
): Promise<KnowledgeBase> {
  const info = await getAuthInfo()
  const requestBody: CreateKnowledgeBaseRequest = {
    connection_id: info.connection_id,
    connection_source_ids: selectedResourceIds,
    name,
    description,
    indexing_params: DEFAULT_INDEXING_PARAMS,
    org_level_role: null,
    cron_job_id: null,
  }

  const response = await fetch(`${apiUrl}/knowledge_bases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${info.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create knowledge base: ${error}`)
  }
  return response.json()
}

export async function triggerKnowledgeBaseSync(
  knowledgeBaseId: string,
): Promise<{ message: string }> {
  const info = await getAuthInfo()
  const endpoint = `/knowledge_bases/sync/trigger/${knowledgeBaseId}/${info.org_id}`

  const response = await fetch(`${apiUrl}${endpoint}`, {
    headers: { Authorization: `Bearer ${info.token}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to trigger sync: ${error}`)
  }
  const result = await response.text()
  return { message: result }
}

export async function getKnowledgeBaseStatus(
  knowledgeBaseId: string,
  resourcePath: string = "/",
): Promise<KBStatusResponse> {
  const info = await getAuthInfo()
  const params = new URLSearchParams({ resource_path: resourcePath })

  const response = await fetch(
    `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`,
    {
      headers: { Authorization: `Bearer ${info.token}` },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get status: ${error}`)
  }
  return response.json()
}

export async function deleteFromKnowledgeBase(
  knowledgeBaseId: string,
  resourcePath: string,
): Promise<void> {
  const info = await getAuthInfo()
  const params = new URLSearchParams({ resource_path: resourcePath })

  const response = await fetch(
    `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources?${params}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${info.token}` },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete resource: ${error}`)
  }
}

