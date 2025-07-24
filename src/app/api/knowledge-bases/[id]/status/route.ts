import { NextRequest, NextResponse } from "next/server"
import { initStackAIClient } from "@/lib/stack-ai"
import type { KBStatusResponse } from "@/lib/types"

/**
 * GET /api/knowledge-bases/[id]/status - Get Knowledge Base status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: knowledgeBaseId } = await params
    const { searchParams } = new URL(request.url)
    const resourcePath = searchParams.get("resource_path") || "/"

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: "Knowledge Base ID is required" },
        { status: 400 },
      )
    }

    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Call Stack AI API to get Knowledge Base status
    const stackAIParams = new URLSearchParams({ resource_path: resourcePath })
    const response = await fetch(
      `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources/children?${stackAIParams}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get KB status: ${error}`)
    }

    const status: KBStatusResponse = await response.json()
    return NextResponse.json(status)
  } catch (error) {
    console.error("Failed to get KB status:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get status",
      },
      { status: 500 },
    )
  }
}
