import { NextRequest, NextResponse } from "next/server"
import { initStackAIClient, getOrgInfo } from "@/lib/stack-ai"

/**
 * POST /api/knowledge-bases/[id]/sync - Trigger sync for a Knowledge Base
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: knowledgeBaseId } = await params

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: "Knowledge Base ID is required" },
        { status: 400 },
      )
    }

    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Get organization info (required for sync endpoint)
    const orgInfo = await getOrgInfo(token)

    // Call Stack AI API to trigger sync
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
    return NextResponse.json({ message: result })
  } catch (error) {
    console.error("Failed to trigger sync:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to trigger sync",
      },
      { status: 500 },
    )
  }
}
