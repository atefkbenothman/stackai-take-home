import type {
  FilesResponse,
  KnowledgeBase,
  KBStatusResponse,
} from "@/lib/types"

/**
 * Fetch files from Google Drive connection
 */
export async function fetchFiles(folderId?: string): Promise<FilesResponse> {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000"

  const url = `${baseUrl}/api/files${folderId ? `?folderId=${folderId}` : ""}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch files: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a new Knowledge Base with selected files
 */
export async function createKnowledgeBase(
  connectionId: string,
  selectedResourceIds: string[],
  name: string,
  description: string,
): Promise<KnowledgeBase> {
  const response = await fetch("/api/knowledge-bases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connectionId,
      selectedResourceIds,
      name,
      description,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create knowledge base: ${error}`)
  }

  return response.json()
}

/**
 * Trigger synchronization/indexing for a Knowledge Base
 */
export async function triggerKnowledgeBaseSync(
  knowledgeBaseId: string,
): Promise<{ message: string }> {
  const response = await fetch(`/api/knowledge-bases/${knowledgeBaseId}/sync`, {
    method: "POST",
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to trigger sync: ${error}`)
  }

  return response.json()
}

/**
 * Get the current status of files in a Knowledge Base
 */
export async function getKnowledgeBaseStatus(
  knowledgeBaseId: string,
  resourcePath: string = "/",
): Promise<KBStatusResponse> {
  const params = new URLSearchParams({ resource_path: resourcePath })
  const response = await fetch(
    `/api/knowledge-bases/${knowledgeBaseId}/status?${params}`,
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get status: ${error}`)
  }

  return response.json()
}

/**
 * Delete/de-index a resource from a Knowledge Base
 */
export async function deleteFromKnowledgeBase(
  knowledgeBaseId: string,
  resourcePath: string,
): Promise<void> {
  const params = new URLSearchParams({ resource_path: resourcePath })
  const response = await fetch(
    `/api/knowledge-bases/${knowledgeBaseId}/resources?${params}`,
    { method: "DELETE" },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete resource: ${error}`)
  }
}

/**
 * Get all Knowledge Bases for the current organization
 */
export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  const response = await fetch("/api/knowledge-bases")

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list knowledge bases: ${error}`)
  }

  return response.json()
}
