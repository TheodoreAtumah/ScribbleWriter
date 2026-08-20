import { Hono } from "hono";
import { requireAuth } from "../auth-middleware";
import { randomHex } from "../crypto";
import type { Env, Variables, BookRow } from "../types";

const books = new Hono<{ Bindings: Env; Variables: Variables }>();
books.use("*", requireAuth);

const COVER_COLORS = ["#1B2340", "#3A2E1F", "#2E3A2A", "#3A1F2E", "#1F2E3A"];

// List all books for the current user, newest first.
books.get("/", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM books WHERE user_id = ? ORDER BY updated_at DESC"
  )
    .bind(userId)
    .all<BookRow>();
  return c.json({ books: results ?? [] });
});

// Create a new book.
books.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ title?: string; author?: string }>().catch(() => ({} as any));
  const id = randomHex(12);
  const now = Date.now();
  const title = body.title?.trim() || "Untitled Book";
  const author = body.author?.trim() || "";
  const coverColor = COVER_COLORS[Math.floor(Math.random() * COVER_COLORS.length)];

  await c.env.DB.prepare(
    "INSERT INTO books (id, user_id, title, author, cover_color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  )
    .bind(id, userId, title, author, coverColor, now, now)
    .run();

  const book = await c.env.DB.prepare("SELECT * FROM books WHERE id = ?").bind(id).first<BookRow>();
  return c.json({ book });
});

// Fetch a single book (must belong to user).
books.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const book = await c.env.DB.prepare("SELECT * FROM books WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<BookRow>();
  if (!book) return c.json({ error: "Book not found" }, 404);
  return c.json({ book });
});

// Update book fields (title, author) - used by inline-edit, writes on blur.
books.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ title?: string; author?: string }>().catch(() => ({} as any));

  const existing = await c.env.DB.prepare("SELECT id FROM books WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first();
  if (!existing) return c.json({ error: "Book not found" }, 404);

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body.title === "string") {
    fields.push("title = ?");
    values.push(body.title);
  }
  if (typeof body.author === "string") {
    fields.push("author = ?");
    values.push(body.author);
  }
  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(id, userId);

  await c.env.DB.prepare(
    `UPDATE books SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`
  )
    .bind(...values)
    .run();

  const book = await c.env.DB.prepare("SELECT * FROM books WHERE id = ?").bind(id).first<BookRow>();
  return c.json({ book });
});

books.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM books WHERE id = ? AND user_id = ?").bind(id, userId).run();
  return c.json({ ok: true });
});

export default books;
