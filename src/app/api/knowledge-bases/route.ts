import { NextRequest, NextResponse } from "next/server"
import { 
  createKnowledgeBaseServer, 
  listKnowledgeBasesServer
} from "@/lib/api/knowledge-base-server"

/**
 * POST /api/knowledge-bases - Create a new Knowledge Base
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { connectionId, selectedResourceIds, name, description } = body
    
    // Validate required fields
    if (!connectionId || !selectedResourceIds || !Array.isArray(selectedResourceIds) || selectedResourceIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: connectionId and selectedResourceIds" },
        { status: 400 }
      )
    }
    
    if (!name || !description) {
      return NextResponse.json(
        { error: "Missing required fields: name and description" },
        { status: 400 }
      )
    }
    
    const kb = await createKnowledgeBaseServer(
      connectionId,
      selectedResourceIds,
      name,
      description
    )
    
    return NextResponse.json(kb)
  } catch (error) {
    console.error("Failed to create knowledge base:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create knowledge base" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/knowledge-bases - List all Knowledge Bases
 */
export async function GET(): Promise<NextResponse> {
  try {
    const kbs = await listKnowledgeBasesServer()
    return NextResponse.json(kbs)
  } catch (error) {
    console.error("Failed to list knowledge bases:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list knowledge bases" },
      { status: 500 }
    )
  }
}