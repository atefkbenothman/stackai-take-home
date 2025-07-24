"use server"

/*
 * Server-side auth utility for direct API calls (no HTTP layer)
 * This function is used to get the auth token for the Stack AI API.
 * It fetches a fresh token each time to avoid cookie handling complexity.
 */
export async function getAuthToken() {
  const supabaseAuthUrl = process.env.STACK_AI_AUTH_URL!
  const anonKey = process.env.SUPABASE_ANON_KEY!
  const email = process.env.EMAIL!
  const password = process.env.PASSWORD!

  const response = await fetch(
    `${supabaseAuthUrl}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Apikey: anonKey,
      },
      body: JSON.stringify({
        email,
        password,
        gotrue_meta_security: {},
      }),
    },
  )

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`)
  }

  const data = await response.json()
  return data.access_token
}
