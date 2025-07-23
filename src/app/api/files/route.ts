import { NextRequest, NextResponse } from "next/server"
import { getFiles } from "@/lib/api/files"

/*
 * HTTP API route that uses the shared server utility.
 * This maintains backward compatibility for client-side calls.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get("folderId")

    const data = await getFiles(folderId || undefined)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Files API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 },
    )
  }
}
