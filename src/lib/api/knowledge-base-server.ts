"use server"

import { getAuthToken } from "@/app/api/auth"
import type {
  CreateKnowledgeBaseRequest,
  KnowledgeBase,
  KBStatusResponse,
} from "@/lib/types"
import { getDefaultIndexingParams } from "./knowledge-base"

/**
 * Server-side utilities for Knowledge Base operations
 */

/**
 * Get organization info (reusable helper)
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
 * Get Google Drive connection (reusable helper)
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
 * Create a Knowledge Base on Stack AI
 */
export async function createKnowledgeBaseServer(
  connectionId: string,
  selectedResourceIds: string[],
  name: string,
  description: string,
): Promise<KnowledgeBase> {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!

  const requestBody: CreateKnowledgeBaseRequest = {
    connection_id: connectionId,
    connection_source_ids: selectedResourceIds,
    name,
    description,
    indexing_params: getDefaultIndexingParams(),
    org_level_role: null,
    cron_job_id: null,
  }

  const response = await fetch(`${apiUrl}/knowledge_bases`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
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
 * Trigger sync for a Knowledge Base
 */
export async function triggerKnowledgeBaseSyncServer(
  knowledgeBaseId: string,
): Promise<{ message: string }> {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!
  const orgInfo = await getOrgInfo(token)

  const response = await fetch(
    `${apiUrl}/knowledge_bases/sync/trigger/${knowledgeBaseId}/${orgInfo.org_id}`,
    {
      method: "GET", // Note: The API uses GET for triggering sync
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to trigger sync: ${error}`)
  }

  // The API returns text, not JSON
  const result = await response.text()
  return { message: result }
}

/**
 * Get Knowledge Base status/resources
 */
export async function getKnowledgeBaseStatusServer(
  knowledgeBaseId: string,
  resourcePath: string = "/",
): Promise<KBStatusResponse> {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!

  const params = new URLSearchParams({ resource_path: resourcePath })
  const response = await fetch(
    `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources/children?${params}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get KB status: ${error}`)
  }

  return response.json()
}

/**
 * Delete resource from Knowledge Base
 */
export async function deleteFromKnowledgeBaseServer(
  knowledgeBaseId: string,
  resourcePath: string,
): Promise<void> {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!

  const params = new URLSearchParams({ resource_path: resourcePath })
  const response = await fetch(
    `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources?${params}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to delete resource: ${error}`)
  }
}

/**
 * List all Knowledge Bases
 */
export async function listKnowledgeBasesServer(): Promise<KnowledgeBase[]> {
  const token = await getAuthToken()
  const apiUrl = process.env.STACK_AI_API_URL!

  const response = await fetch(`${apiUrl}/knowledge_bases`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list knowledge bases: ${error}`)
  }

  return response.json()
}
