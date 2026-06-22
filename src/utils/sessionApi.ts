/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Session API Utility (Frontend)
 *
 * Provides functions to interact with the secure HTTP-only cookie
 * session endpoints on the backend. Since the frontend cannot read
 * HttpOnly cookies directly, all session state is managed through
 * these API calls.
 *
 * NOTE: These are future-ready scaffolding for when authentication
 * is added. The existing localStorage weather/game caches are
 * intentionally NOT migrated — they contain non-sensitive data.
 */

const SESSION_ENDPOINT = "/api/auth/session";

interface SessionStatus {
  authenticated: boolean;
  sessionId?: string;
  message?: string;
}

/**
 * Create a new secure session (sets HttpOnly cookie on the server).
 * Call this after successful user authentication.
 */
export async function createSession(payload?: Record<string, unknown>): Promise<SessionStatus> {
  try {
    const response = await fetch(SESSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin", // ensures cookies are sent/received
      body: JSON.stringify(payload || {}),
    });

    if (!response.ok) {
      throw new Error(`Session creation failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to create session:", error);
    return { authenticated: false, message: "Session creation failed" };
  }
}

/**
 * Check the current session status.
 * Returns whether the user has an active authenticated session.
 */
export async function getSessionStatus(): Promise<SessionStatus> {
  try {
    const response = await fetch(SESSION_ENDPOINT, {
      method: "GET",
      credentials: "same-origin",
    });

    if (!response.ok) {
      return { authenticated: false };
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to check session:", error);
    return { authenticated: false };
  }
}

/**
 * Clear the current session (removes the HttpOnly cookie).
 * Call this on user logout.
 */
export async function clearSession(): Promise<boolean> {
  try {
    const response = await fetch(SESSION_ENDPOINT, {
      method: "DELETE",
      credentials: "same-origin",
    });

    return response.ok;
  } catch (error) {
    console.error("Failed to clear session:", error);
    return false;
  }
}
