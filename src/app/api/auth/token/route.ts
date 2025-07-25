import { NextResponse } from "next/server"
import { getAuthToken } from "@/lib/stack-ai-auth"
import { getOrgInfo, getGoogleDriveConnection } from "@/lib/stack-ai-api"

/**
 * Get authentication token and connection info for client-side Stack AI calls
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get authentication token using existing secure server-side logic
    const { token, expires_in } = await getAuthToken()

    // Get organization and connection info needed for Stack AI API calls
    const orgData = await getOrgInfo(token)
    const connection = await getGoogleDriveConnection(token)

    // Return token and connection info for client use
    return NextResponse.json({
      token,
      expires_in,
      org_id: orgData.org_id,
      connection_id: connection.connection_id,
    })
  } catch (error) {
    console.error("Failed to get auth token:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get authentication token",
      },
      { status: 500 },
    )
  }
}
