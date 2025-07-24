import { NextRequest, NextResponse } from "next/server"
import { deleteFromKnowledgeBaseServer } from "@/lib/api/knowledge-base-server"

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

    await deleteFromKnowledgeBaseServer(knowledgeBaseId, resourcePath)

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
