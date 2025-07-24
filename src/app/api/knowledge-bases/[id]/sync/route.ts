import { NextRequest, NextResponse } from "next/server"
import { triggerKnowledgeBaseSyncServer } from "@/lib/api/knowledge-base-server"

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

    const result = await triggerKnowledgeBaseSyncServer(knowledgeBaseId)

    return NextResponse.json(result)
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
