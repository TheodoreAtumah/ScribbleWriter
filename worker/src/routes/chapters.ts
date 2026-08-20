import { Hono } from "hono";
import { requireAuth } from "../auth-middleware";
import { randomHex } from "../crypto";
import type { Env, Variables, ChapterRow, BookRow } from "../types";

const chapters = new Hono<{ Bindings: Env; Variables: Variables }>();
chapters.use("*", requireAuth);

async function assertOwnsBook(env: Env, bookId: string, userId: string): Promise<boolean> {
  const book = await env.DB.prepare("SELECT id FROM books WHERE id = ? AND user_id = ?")
    .bind(bookId, userId)
    .first<Pick<BookRow, "id">>();
  return !!book;
}

// List chapters for a book, in order.
chapters.get("/book/:bookId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  if (!(await assertOwnsBook(c.env, bookId, userId))) return c.json({ error: "Book not found" }, 404);

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM chapters WHERE book_id = ? ORDER BY sort_order ASC"
  )
    .bind(bookId)
    .all<ChapterRow>();
  return c.json({ chapters: results ?? [] });
});

// Create a new chapter at the end of the book.
chapters.post("/book/:bookId", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  if (!(await assertOwnsBook(c.env, bookId, userId))) return c.json({ error: "Book not found" }, 404);

  const body = await c.req.json<{ title?: string }>().catch(() => ({} as any));
  const maxOrder = await c.env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) as m FROM chapters WHERE book_id = ?"
  )
    .bind(bookId)
    .first<{ m: number }>();

  const id = randomHex(12);
  const now = Date.now();
  await c.env.DB.prepare(
    "INSERT INTO chapters (id, book_id, title, summary, body, sort_order, created_at, updated_at) VALUES (?, ?, ?, '', '', ?, ?, ?)"
  )
    .bind(id, bookId, body.title?.trim() || "Untitled Chapter", (maxOrder?.m ?? -1) + 1, now, now)
    .run();

  const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first<ChapterRow>();
  return c.json({ chapter });
});

// Update a chapter's title/summary/body - the inline-edit write-through target.
chapters.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ title?: string; summary?: string; body?: string }>().catch(() => ({} as any));

  const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first<ChapterRow>();
  if (!chapter || !(await assertOwnsBook(c.env, chapter.book_id, userId))) {
    return c.json({ error: "Chapter not found" }, 404);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (typeof body.title === "string") { fields.push("title = ?"); values.push(body.title); }
  if (typeof body.summary === "string") { fields.push("summary = ?"); values.push(body.summary); }
  if (typeof body.body === "string") { fields.push("body = ?"); values.push(body.body); }
  if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);

  fields.push("updated_at = ?");
  values.push(Date.now());
  values.push(id);

  await c.env.DB.prepare(`UPDATE chapters SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
  const updated = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first<ChapterRow>();
  return c.json({ chapter: updated });
});

// Reorder chapters: body is an array of {id, order}.
chapters.post("/book/:bookId/reorder", async (c) => {
  const userId = c.get("userId");
  const bookId = c.req.param("bookId");
  if (!(await assertOwnsBook(c.env, bookId, userId))) return c.json({ error: "Book not found" }, 404);

  const body = await c.req.json<{ order?: { id: string; order: number }[] }>().catch(() => ({} as any));
  if (!body.order?.length) return c.json({ error: "No order provided" }, 400);

  const stmts = body.order.map(({ id, order }: { id: string; order: number }) =>
    c.env.DB.prepare("UPDATE chapters SET sort_order = ?, updated_at = ? WHERE id = ? AND book_id = ?").bind(
      order,
      Date.now(),
      id,
      bookId
    )
  );
  await c.env.DB.batch(stmts);
  return c.json({ ok: true });
});

chapters.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?").bind(id).first<ChapterRow>();
  if (!chapter || !(await assertOwnsBook(c.env, chapter.book_id, userId))) {
    return c.json({ error: "Chapter not found" }, 404);
  }
  await c.env.DB.prepare("DELETE FROM chapters WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export default chapters;
