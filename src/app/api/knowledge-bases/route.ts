import { NextRequest, NextResponse } from "next/server"
import { initStackAIClient, getDefaultIndexingParams } from "@/lib/stack-ai"
import type { CreateKnowledgeBaseRequest, KnowledgeBase } from "@/lib/types"

/**
 * POST /api/knowledge-bases - Create a new Knowledge Base
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json()
    const { connectionId, selectedResourceIds, name, description } = body

    // Validate required fields
    if (
      !connectionId ||
      !selectedResourceIds ||
      !Array.isArray(selectedResourceIds) ||
      selectedResourceIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: connectionId and selectedResourceIds",
        },
        { status: 400 },
      )
    }

    if (!name || !description) {
      return NextResponse.json(
        { error: "Missing required fields: name and description" },
        { status: 400 },
      )
    }

    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Create Knowledge Base request body
    const requestBody: CreateKnowledgeBaseRequest = {
      connection_id: connectionId,
      connection_source_ids: selectedResourceIds,
      name,
      description,
      indexing_params: getDefaultIndexingParams(),
      org_level_role: null,
      cron_job_id: null,
    }

    // Call Stack AI API to create Knowledge Base
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

    const kb: KnowledgeBase = await response.json()
    return NextResponse.json(kb)
  } catch (error) {
    console.error("Failed to create knowledge base:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create knowledge base",
      },
      { status: 500 },
    )
  }
}

/**
 * GET /api/knowledge-bases - List all Knowledge Bases
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Initialize Stack AI client
    const { token, apiUrl } = await initStackAIClient()

    // Call Stack AI API to list Knowledge Bases
    const response = await fetch(`${apiUrl}/knowledge_bases`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to list knowledge bases: ${error}`)
    }

    const kbs: KnowledgeBase[] = await response.json()
    return NextResponse.json(kbs)
  } catch (error) {
    console.error("Failed to list knowledge bases:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to list knowledge bases",
      },
      { status: 500 },
    )
  }
}
