import { Hono } from "hono";
import { requireAuth } from "../auth-middleware";
import { randomHex } from "../crypto";
import type { Env, Variables, FragmentRow, BookRow } from "../types";

const fragments = new Hono<{ Bindings: Env; Variables: Variables }>();
fragments.use("*", requireAuth);

async function assertOwnsBook(env: Env, bookId: string, userId: string): Promise<boolean> {
  const book = await env.DB.prepare("SELECT id FROM books WHERE id = ? AND user_id = ?")
    .bind(bookId, userId)
    .first<Pick<BookRow, "id">>();
  return !!book;
}

// List fragments for a book, newest first.
fragments.get("/book/:bookId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  if (!(await assertOwnsBook(c.env, bookId, userId))) return c.json({ error: "Book not found" }, 404);

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM fragments WHERE book_id = ? ORDER BY created_at DESC"
  )
    .bind(bookId)
    .all<FragmentRow>();
  return c.json({ fragments: results ?? [] });
});

// Create a new fragment - the capture action from Scribble.
fragments.post("/book/:bookId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  if (!(await assertOwnsBook(c.env, bookId, userId))) return c.json({ error: "Book not found" }, 404);

  const body = await c.req.json<{ text?: string; source?: string }>().catch(() => ({} as any));
  const text = body.text?.trim();
  if (!text) return c.json({ error: "Fragment text is required" }, 400);

  const id = randomHex(12);
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO fragments (id, book_id, text, source, sorted, placed_chapter_id, created_at) VALUES (?, ?, ?, ?, 0, NULL, ?)"
  )
    .bind(id, bookId, text, body.source === "upload" ? "upload" : "typed", now)
    .run();

  const fragment = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?").bind(id).first<FragmentRow>();
  return c.json({ fragment });
});

// Mark a fragment sorted/unsorted, or record which chapter it was placed into.
fragments.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req
    .json<{ sorted?: boolean; text?: string; placedChapterId?: string | null }>()
    .catch(() => ({} as any));

  const fragment = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?").bind(id).first<FragmentRow>();
  if (!fragment || !(await assertOwnsBook(c.env, fragment.book_id, userId))) {
    return c.json({ error: "Fragment not found" }, 404);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body.sorted === "boolean") { fields.push("sorted = ?"); values.push(body.sorted ? 1 : 0); }
  if (typeof body.text === "string") { fields.push("text = ?"); values.push(body.text); }
  if (body.placedChapterId !== undefined) { fields.push("placed_chapter_id = ?"); values.push(body.placedChapterId); }
  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);

  values.push(id);
  await c.env.DB.prepare(`UPDATE fragments SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();

  const updated = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?").bind(id).first<FragmentRow>();
  return c.json({ fragment: updated });
});

fragments.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const fragment = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?").bind(id).first<FragmentRow>();
  if (!fragment || !(await assertOwnsBook(c.env, fragment.book_id, userId))) {
    return c.json({ error: "Fragment not found" }, 404);
  }
  await c.env.DB.prepare("DELETE FROM fragments WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export default fragments;
