import { stackAIClient } from "@/lib/stack-ai-client"
import type {
  FilesResponse,
  KnowledgeBase,
  KBStatusResponse,
} from "@/lib/types"

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
  return stackAIClient.createKnowledgeBase(selectedResourceIds, name, description)
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
