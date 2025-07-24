import { NextRequest, NextResponse } from "next/server"
import { getKnowledgeBaseStatusServer } from "@/lib/api/knowledge-base-server"

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

    const status = await getKnowledgeBaseStatusServer(
      knowledgeBaseId,
      resourcePath,
    )

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
