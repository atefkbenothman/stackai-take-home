import {
  CreateKnowledgeBaseRequest,
  KnowledgeBase,
  KBStatusResponse,
} from "@/lib/types"

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

/**
 * Helper function to create default indexing parameters
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

/**
 * Helper to generate a Knowledge Base name from selected files
 */
export function generateKnowledgeBaseName(selectedFileNames: string[]): string {
  const timestamp = new Date().toISOString().split("T")[0]
  if (selectedFileNames.length === 1) {
    return `KB - ${selectedFileNames[0]} - ${timestamp}`
  } else if (selectedFileNames.length <= 3) {
    return `KB - ${selectedFileNames.join(", ")} - ${timestamp}`
  } else {
    return `KB - ${selectedFileNames.length} files - ${timestamp}`
  }
}

/**
 * Check if a file path is already indexed in any Knowledge Base
 * This would typically call an endpoint to check across all KBs
 */
export async function checkIfFileIsIndexed(
  filePath: string,
): Promise<{ isIndexed: boolean; knowledgeBaseId?: string }> {
  const response = await fetch(
    `/api/knowledge-bases/check-indexed?${new URLSearchParams({ file_path: filePath })}`,
  )

  if (!response.ok) {
    // If endpoint doesn't exist yet, return not indexed
    if (response.status === 404) {
      return { isIndexed: false }
    }
    const error = await response.text()
    throw new Error(`Failed to check indexed status: ${error}`)
  }

  return response.json()
}
