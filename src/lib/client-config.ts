/**
 * Client-side configuration utilities
 * Safely access environment variables in browser context
 */

/**
 * Get Stack AI API URL for client-side requests
 * Uses public environment variable safe for browser exposure
 */
export function getStackAIApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_STACK_AI_API_URL

  if (!apiUrl) {
    throw new Error(
      "NEXT_PUBLIC_STACK_AI_API_URL environment variable is required for client-side Stack AI API calls"
    )
  }

  return apiUrl
}

/**
 * Validate all required client-side environment variables
 * Call this at application startup to fail fast if misconfigured
 */
export function validateClientConfig(): void {
  try {
    getStackAIApiUrl()
  } catch (error) {
    console.error("Client configuration validation failed:", error)
    throw error
  }
}