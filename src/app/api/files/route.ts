import { NextRequest, NextResponse } from "next/server"
import { getFilesServer } from "@/lib/api/files-server"

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Get folderId from query parameters
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId") || undefined

    const response = await getFilesServer(folderId)
    return NextResponse.json(response)
  } catch (error) {
    console.error("API files fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    )
  }
}
