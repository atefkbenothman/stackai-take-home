import { getStackAIApiUrl } from "@/lib/client-config"
import type {
  FilesResponse,
  KnowledgeBase,
  KBStatusResponse,
  CreateKnowledgeBaseRequest,
  RawFileFromAPI,
  FileItem,
} from "@/lib/types"

/**
 * Authentication and connection info from server
 */
interface AuthInfo {
  token: string
  expires_in: number
  org_id: string
  connection_id: string
}

/**
 * Stack AI client for direct API calls with automatic token management
 */
class StackAIClient {
  private authInfo: AuthInfo | null = null
  private expiresAt: number = 0
  private readonly apiUrl: string

  constructor() {
    this.apiUrl = getStackAIApiUrl()
  }

  /**
   * Get valid authentication token and connection info
   * Automatically refreshes expired tokens
   */
  private async getAuthInfo(): Promise<AuthInfo> {
    // Return cached auth info if still valid (with 1 minute buffer)
    if (this.authInfo && Date.now() < this.expiresAt - 60000) {
      return this.authInfo
    }

    // Get fresh auth info from our secure server endpoint
    const response = await fetch("/api/auth/token")

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Authentication failed: ${error}`)
    }

    const authInfo: AuthInfo = await response.json()

    // Cache auth info in memory
    this.authInfo = authInfo
    this.expiresAt = Date.now() + authInfo.expires_in * 1000

    return authInfo
  }

  /**
   * Make authenticated request to Stack AI API with automatic retry on auth failure
   */
  private async makeRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const authInfo = await this.getAuthInfo()

    const response = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${authInfo.token}`,
        ...options.headers,
      },
    })

    // Handle auth errors by clearing cache and retrying once
    if (response.status === 401) {
      this.authInfo = null
      this.expiresAt = 0

      const retryAuthInfo = await this.getAuthInfo()
      return fetch(`${this.apiUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${retryAuthInfo.token}`,
          ...options.headers,
        },
      })
    }

    return response
  }

  /**
   * Fetch files from Google Drive connection
   */
  async fetchFiles(folderId?: string): Promise<FilesResponse> {
    const authInfo = await this.getAuthInfo()

    let endpoint = `/connections/${authInfo.connection_id}/resources/children`
    if (folderId) {
      endpoint += `?resource_id=${folderId}`
    }

    const response = await this.makeRequest(endpoint)

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`)
    }

    const data = await response.json()

    // Transform response to match expected format
    const files = (data.data || []).map(
      (file: RawFileFromAPI): FileItem => ({
        ...file,
        parentId: folderId, // Set parentId to the folder we're fetching from
      }),
    )

    return {
      files,
      connection_id: authInfo.connection_id,
      org_id: authInfo.org_id,
    }
  }

  /**
   * Create a new Knowledge Base with selected files
   */
  async createKnowledgeBase(
    selectedResourceIds: string[],
    name: string,
    description: string,
  ): Promise<KnowledgeBase> {
    const authInfo = await this.getAuthInfo()

    const requestBody: CreateKnowledgeBaseRequest = {
      connection_id: authInfo.connection_id,
      connection_source_ids: selectedResourceIds,
      name,
      description,
      indexing_params: {
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
      },
      org_level_role: null,
      cron_job_id: null,
    }

    const response = await this.makeRequest("/knowledge_bases", {
      method: "POST",
      headers: {
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

  /**
   * Trigger synchronization/indexing for a Knowledge Base
   */
  async triggerKnowledgeBaseSync(
    knowledgeBaseId: string,
  ): Promise<{ message: string }> {
    const authInfo = await this.getAuthInfo()

    const response = await this.makeRequest(
      `/knowledge_bases/sync/trigger/${knowledgeBaseId}/${authInfo.org_id}`,
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to trigger sync: ${error}`)
    }

    // Stack AI API returns text, not JSON for sync trigger
    const result = await response.text()
    return { message: result }
  }

  /**
   * Get the current status of files in a Knowledge Base
   */
  async getKnowledgeBaseStatus(
    knowledgeBaseId: string,
    resourcePath: string = "/",
  ): Promise<KBStatusResponse> {
    const params = new URLSearchParams({ resource_path: resourcePath })
    const response = await this.makeRequest(
      `/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`,
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
  async deleteFromKnowledgeBase(
    knowledgeBaseId: string,
    resourcePath: string,
  ): Promise<void> {
    const params = new URLSearchParams({ resource_path: resourcePath })
    const response = await this.makeRequest(
      `/knowledge_bases/${knowledgeBaseId}/resources?${params}`,
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
  async listKnowledgeBases(): Promise<KnowledgeBase[]> {
    const response = await this.makeRequest("/knowledge_bases")

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to list knowledge bases: ${error}`)
    }

    return response.json()
  }
}

// Export singleton instance
export const stackAIClient = new StackAIClient()

/**
 * Fetch files from Google Drive connection
 */
export async function fetchFiles(folderId?: string): Promise<FilesResponse> {
  return stackAIClient.fetchFiles(folderId)
}

/**
 * Create a new Knowledge Base with selected files
 */
export async function createKnowledgeBase(
  _connectionId: string, // No longer needed, kept for backward compatibility
  selectedResourceIds: string[],
  name: string,
  description: string,
): Promise<KnowledgeBase> {
  return stackAIClient.createKnowledgeBase(
    selectedResourceIds,
    name,
    description,
  )
}

/**
 * Trigger synchronization/indexing for a Knowledge Base
 */
export async function triggerKnowledgeBaseSync(
  knowledgeBaseId: string,
): Promise<{ message: string }> {
  return stackAIClient.triggerKnowledgeBaseSync(knowledgeBaseId)
}

/**
 * Get the current status of files in a Knowledge Base
 */
export async function getKnowledgeBaseStatus(
  knowledgeBaseId: string,
  resourcePath: string = "/",
): Promise<KBStatusResponse> {
  return stackAIClient.getKnowledgeBaseStatus(knowledgeBaseId, resourcePath)
}

/**
 * Delete/de-index a resource from a Knowledge Base
 */
export async function deleteFromKnowledgeBase(
  knowledgeBaseId: string,
  resourcePath: string,
): Promise<void> {
  return stackAIClient.deleteFromKnowledgeBase(knowledgeBaseId, resourcePath)
}

/**
 * Get all Knowledge Bases for the current organization
 */
export async function listKnowledgeBases(): Promise<KnowledgeBase[]> {
  return stackAIClient.listKnowledgeBases()
}
