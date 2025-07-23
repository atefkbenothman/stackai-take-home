import { cookies } from "next/headers"

/*
 * This function is used to get the auth token for the Stack AI API.
 * It checks if we have a cached token and returns it if it's still valid.
 * If not, it fetches a fresh token and caches it in cookies.
 */
export async function getAuthToken() {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get("stack_ai_token")
  const expirationCookie = cookieStore.get("stack_ai_expires")

  // Check if we have a valid cached token
  if (tokenCookie && expirationCookie) {
    const expiresAt = parseInt(expirationCookie.value)
    const now = Date.now()

    // Return cached token if still valid (with 5-minute buffer)
    if (now < expiresAt - 5 * 60 * 1000) {
      return tokenCookie.value
    }
  }

  // Fetch fresh token
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

  // Cache in cookies (only in Route Handler context)
  // Skip cookie setting in RSC context to avoid "Cookies can only be modified" error
  try {
    const expiresAt = Date.now() + data.expires_in * 1000

    cookieStore.set("stack_ai_token", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.expires_in,
    })

    cookieStore.set("stack_ai_expires", expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: data.expires_in,
    })
  } catch (error) {
    // Silently skip cookie setting if called from RSC context
    // The token will still be returned and work for the current request
    console.log("Cookie setting skipped (likely called from RSC context)")
  }

  return data.access_token
}
