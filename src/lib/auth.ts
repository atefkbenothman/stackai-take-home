import { cookies } from "next/headers"

/**
 * Server-side authentication utilities for Stack AI
 */

/**
 * Authentication result containing token and expiration info
 */
export interface AuthResult {
  token: string
  expires_in: number
}

/**
 * Get authentication token and expiration info for Stack AI API
 * Handles token caching with HTTP-only cookies for security
 * Automatically refreshes expired tokens
 */
export async function getAuthToken(): Promise<AuthResult> {
  const cookieStore = await cookies()
  const tokenCookie = cookieStore.get("stack_ai_token")
  const expirationCookie = cookieStore.get("stack_ai_expires")

  // Check if we have a valid cached token
  if (tokenCookie && expirationCookie) {
    const expiresAt = parseInt(expirationCookie.value)
    const now = Date.now()

    // Return cached token if still valid (with 5-minute buffer)
    if (now < expiresAt - 5 * 60 * 1000) {
      const remainingSeconds = Math.floor((expiresAt - now) / 1000)
      return {
        token: tokenCookie.value,
        expires_in: remainingSeconds,
      }
    }
  }

  // Fetch fresh token from Supabase Auth
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

  // Cache token in HTTP-only cookies for security
  // Skip cookie setting in RSC context to avoid "Cookies can only be modified" error
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

  return {
    token: data.access_token,
    expires_in: data.expires_in,
  }
}
