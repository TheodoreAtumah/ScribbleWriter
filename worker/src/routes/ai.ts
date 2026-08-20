import { Hono } from "hono";
import { requireAuth } from "../auth-middleware";
import type { Env, Variables, FragmentRow, ChapterRow, VoiceProfileRow, BookRow } from "../types";

const ai = new Hono<{ Bindings: Env; Variables: Variables }>();
ai.use("*", requireAuth);

const MODEL = "claude-sonnet-5";

interface PlacementProposal {
  targetChapterId: string | null;
  newChapterTitle: string | null; // set if the AI thinks a new chapter is needed
  rationale: string;
  rewrittenText: string;
}

// Propose where a fragment belongs and how it reads once placed in-voice.
// This does NOT write to the manuscript — it returns a preview the user
// must explicitly confirm (see /api/ai/commit) or discard.
ai.post("/propose/:fragmentId", async (c) => {
  const userId = c.get("userId");
  const fragmentId = c.req.param("fragmentId");

  const fragment = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?")
    .bind(fragmentId)
    .first<FragmentRow>();
  if (!fragment) return c.json({ error: "Fragment not found" }, 404);

  const book = await c.env.DB.prepare("SELECT * FROM books WHERE id = ? AND user_id = ?")
    .bind(fragment.book_id, userId)
    .first<BookRow>();
  if (!book) return c.json({ error: "Book not found" }, 404);

  const { results: chapterRows } = await c.env.DB.prepare(
    "SELECT * FROM chapters WHERE book_id = ? ORDER BY sort_order ASC"
  )
    .bind(book.id)
    .all<ChapterRow>();
  const chapters = chapterRows ?? [];

  const voiceProfile = await c.env.DB.prepare("SELECT * FROM voice_profiles WHERE user_id = ?")
    .bind(userId)
    .first<VoiceProfileRow>();

  if (!c.env.ANTHROPIC_API_KEY) {
    return c.json({ error: "AI is not configured on this deployment yet." }, 503);
  }

  const chapterList = chapters.length
    ? chapters
        .map((ch, i) => `${i + 1}. [id: ${ch.id}] "${ch.title}"\n   Summary: ${ch.summary || "(no summary yet)"}`)
        .join("\n")
    : "(This book has no chapters yet. You may propose creating the first one.)";

  const voiceBlock = voiceProfile?.sample_text
    ? `Here is a sample of the author's own writing, showing their natural voice, sentence rhythm, and word choice. Match this voice closely when rewriting — do not smooth it into generic prose:\n\n"""\n${voiceProfile.sample_text}\n"""\n\n${voiceProfile.notes ? `Additional notes from the author about their style: ${voiceProfile.notes}` : ""}`
    : "The author has not uploaded a voice sample yet. Stay close to the fragment's own existing phrasing rather than inventing a generic 'book' voice — preserve their word choices and sentence patterns as much as possible, only smoothing what's needed for it to read as connected prose.";

  const systemPrompt = `You are an editorial assistant inside ScribbleWriter, an app that helps writers turn rough fragments into a structured manuscript in their own voice. Your job right now is ONE thing: given a single rough fragment, decide which chapter of the book it belongs in (or whether it needs a new chapter), and rewrite it so it reads as a polished part of that chapter — while staying unmistakably in the author's own voice, not a generic AI voice.

Rules:
- Preserve the author's voice above all else. Do not embellish, moralize, or add content that wasn't implied by the fragment.
- The rewrite should be a natural continuation of prose in that chapter's style, not a summary of the fragment.
- If no existing chapter fits, propose a new chapter with a short, fitting title.
- Respond with ONLY a JSON object, no markdown fences, no preamble, matching exactly this shape:
{"targetChapterId": string|null, "newChapterTitle": string|null, "rationale": string, "rewrittenText": string}
- targetChapterId must be one of the existing chapter ids listed below, or null if proposing a new chapter.
- rationale is one short sentence explaining the placement, written to the author.
- rewrittenText is the fragment rewritten in voice, ready to insert into the chapter body.`;

  const userPrompt = `Book: "${book.title}"${book.author ? ` by ${book.author}` : ""}

Existing chapters:
${chapterList}

${voiceBlock}

Fragment to place (raw, unedited from the author's Scribble inbox):
"""
${fragment.text}
"""

Decide where this belongs and rewrite it in voice.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": c.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return c.json({ error: "The AI service had trouble responding. Please try again." }, 502);
    }

    const data = await response.json<{ content: { type: string; text?: string }[] }>();
    const textBlock = data.content.find((b) => b.type === "text");
    if (!textBlock?.text) {
      return c.json({ error: "The AI did not return a usable response." }, 502);
    }

    let cleaned = textBlock.text.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(json)?/, "").replace(/```$/, "").trim();
    }

    let parsed: PlacementProposal;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response as JSON:", cleaned);
      return c.json({ error: "The AI response could not be understood. Please try again." }, 502);
    }

    return c.json({
      proposal: parsed,
      chapters, // returned so the frontend can show chapter titles without a second fetch
    });
  } catch (err) {
    console.error("AI placement request failed:", err);
    return c.json({ error: "Something went wrong reaching the AI service." }, 502);
  }
});

// Commit a previously-proposed placement: writes the rewritten text into
// the target chapter's body (creating the chapter first if needed), marks
// the fragment as sorted, and links it to the chapter it landed in.
ai.post("/commit/:fragmentId", async (c) => {
  const userId = c.get("userId");
  const fragmentId = c.req.param("fragmentId");
  const body = await c.req
    .json<{
      targetChapterId?: string | null;
      newChapterTitle?: string | null;
      rewrittenText?: string;
    }>()
    .catch(() => ({} as any));

  if (!body.rewrittenText?.trim()) {
    return c.json({ error: "No text to commit." }, 400);
  }

  const fragment = await c.env.DB.prepare("SELECT * FROM fragments WHERE id = ?")
    .bind(fragmentId)
    .first<FragmentRow>();
  if (!fragment) return c.json({ error: "Fragment not found" }, 404);

  const book = await c.env.DB.prepare("SELECT * FROM books WHERE id = ? AND user_id = ?")
    .bind(fragment.book_id, userId)
    .first<BookRow>();
  if (!book) return c.json({ error: "Book not found" }, 404);

  const now = Date.now();
  let chapterId = body.targetChapterId ?? null;

  if (!chapterId) {
    // Create a new chapter at the end of the book.
    const maxOrder = await c.env.DB.prepare(
      "SELECT COALESCE(MAX(sort_order), -1) as m FROM chapters WHERE book_id = ?"
    )
      .bind(book.id)
      .first<{ m: number }>();
    const newId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    await c.env.DB.prepare(
      "INSERT INTO chapters (id, book_id, title, summary, body, sort_order, created_at, updated_at) VALUES (?, ?, ?, '', ?, ?, ?, ?)"
    )
      .bind(newId, book.id, body.newChapterTitle?.trim() || "Untitled Chapter", body.rewrittenText, (maxOrder?.m ?? -1) + 1, now, now)
      .run();
    chapterId = newId;
  } else {
    const chapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ? AND book_id = ?")
      .bind(chapterId, book.id)
      .first<ChapterRow>();
    if (!chapter) return c.json({ error: "Target chapter not found" }, 404);

    const newBody = chapter.body ? `${chapter.body}\n\n${body.rewrittenText}` : body.rewrittenText;
    await c.env.DB.prepare("UPDATE chapters SET body = ?, updated_at = ? WHERE id = ?")
      .bind(newBody, now, chapterId)
      .run();
  }

  await c.env.DB.prepare(
    "UPDATE fragments SET sorted = 1, placed_chapter_id = ? WHERE id = ?"
  )
    .bind(chapterId, fragmentId)
    .run();

  const updatedChapter = await c.env.DB.prepare("SELECT * FROM chapters WHERE id = ?")
    .bind(chapterId)
    .first<ChapterRow>();

  return c.json({ chapter: updatedChapter });
});

export default ai;
