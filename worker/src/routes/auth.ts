import { Hono } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";
import { hashPassword, verifyPassword, newSessionToken, randomHex } from "../crypto";
import { SESSION_COOKIE, requireAuth } from "../auth-middleware";
import type { Env, Variables, UserRow } from "../types";

const auth = new Hono<{ Bindings: Env; Variables: Variables }>();

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createSession(env: Env, userId: string): Promise<string> {
  const token = newSessionToken();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)"
  )
    .bind(token, userId, now, now + SESSION_DURATION_MS)
    .run();
  return token;
}

function setSessionCookie(c: any, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });
}

auth.post("/signup", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !isValidEmail(email)) {
    return c.json({ error: "Please enter a valid email address." }, 400);
  }
  if (!password || password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters." }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return c.json({ error: "An account with that email already exists." }, 409);
  }

  const { hash, salt } = await hashPassword(password);
  const userId = randomHex(16);
  const now = Date.now();

  await c.env.DB.prepare(
    "INSERT INTO users (id, email, password_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)"
  )
    .bind(userId, email, hash, salt, now)
    .run();

  const token = await createSession(c.env, userId);
  setSessionCookie(c, token);

  return c.json({ user: { id: userId, email } });
});

auth.post("/login", async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>().catch(() => null);
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return c.json({ error: "Email and password are required." }, 400);
  }

  const user = await c.env.DB.prepare("SELECT * FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();

  if (!user) {
    return c.json({ error: "Incorrect email or password." }, 401);
  }

  const ok = await verifyPassword(password, user.salt, user.password_hash);
  if (!ok) {
    return c.json({ error: "Incorrect email or password." }, 401);
  }

  const token = await createSession(c.env, user.id);
  setSessionCookie(c, token);

  return c.json({ user: { id: user.id, email: user.email } });
});

auth.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

auth.get("/me", requireAuth, async (c) => {
  const userId = c.get("userId");
  const user = await c.env.DB.prepare("SELECT id, email FROM users WHERE id = ?")
    .bind(userId)
    .first<{ id: string; email: string }>();
  if (!user) return c.json({ error: "Not found" }, 404);
  return c.json({ user });
});

export default auth;
