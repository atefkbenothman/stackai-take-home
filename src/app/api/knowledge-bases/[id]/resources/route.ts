import { NextRequest, NextResponse } from "next/server"
import { initStackAIClient } from "@/lib/stack-ai"

/**
 * DELETE /api/knowledge-bases/[id]/resources - De-index a resource from Knowledge Base
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const { id: knowledgeBaseId } = await params
    const { searchParams } = new URL(request.url)
    const resourcePath = searchParams.get("resource_path")

    if (!knowledgeBaseId) {
      return NextResponse.json(
        { error: "Knowledge Base ID is required" },
        { status: 400 },
      )
    }

    if (!resourcePath) {
      return NextResponse.json(
        { error: "Resource path is required" },
        { status: 400 },
      )
    }

    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Call Stack AI API to delete resource from Knowledge Base
    const stackAIParams = new URLSearchParams({ resource_path: resourcePath })
    const response = await fetch(
      `${apiUrl}/knowledge_bases/${knowledgeBaseId}/resources?${stackAIParams}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to delete resource: ${error}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete resource:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete resource",
      },
      { status: 500 },
    )
  }
}
