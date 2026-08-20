import { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { Env, Variables } from "./types";

export const SESSION_COOKIE = "sw_session";

/**
 * Requires a valid, non-expired session cookie. Attaches userId to context.
 * Also opportunistically deletes expired sessions it encounters.
 */
export async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const row = await c.env.DB.prepare(
    "SELECT user_id, expires_at FROM sessions WHERE token = ?"
  )
    .bind(token)
    .first<{ user_id: string; expires_at: number }>();

  if (!row) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  if (row.expires_at < Date.now()) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return c.json({ error: "Session expired" }, 401);
  }

  c.set("userId", row.user_id);
  await next();
}
