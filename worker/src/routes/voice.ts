import { Hono } from "hono";
import { requireAuth } from "../auth-middleware";
import type { Env, Variables, VoiceProfileRow } from "../types";

const voice = new Hono<{ Bindings: Env; Variables: Variables }>();
voice.use("*", requireAuth);

voice.get("/", async (c) => {
  const userId = c.get("userId");
  const profile = await c.env.DB.prepare("SELECT * FROM voice_profiles WHERE user_id = ?")
    .bind(userId)
    .first<VoiceProfileRow>();
  return c.json({ voiceProfile: profile ?? { user_id: userId, sample_text: "", notes: "", updated_at: 0 } });
});

voice.patch("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ sampleText?: string; notes?: string }>().catch(() => ({} as any));
  const now = Date.now();

  const existing = await c.env.DB.prepare("SELECT user_id FROM voice_profiles WHERE user_id = ?")
    .bind(userId)
    .first();

  if (existing) {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (typeof body.sampleText === "string") { fields.push("sample_text = ?"); values.push(body.sampleText); }
    if (typeof body.notes === "string") { fields.push("notes = ?"); values.push(body.notes); }
    if (fields.length === 0) return c.json({ error: "No fields to update" }, 400);
    fields.push("updated_at = ?");
    values.push(now, userId);
    await c.env.DB.prepare(`UPDATE voice_profiles SET ${fields.join(", ")} WHERE user_id = ?`)
      .bind(...values)
      .run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO voice_profiles (user_id, sample_text, notes, updated_at) VALUES (?, ?, ?, ?)"
    )
      .bind(userId, body.sampleText ?? "", body.notes ?? "", now)
      .run();
  }

  const profile = await c.env.DB.prepare("SELECT * FROM voice_profiles WHERE user_id = ?")
    .bind(userId)
    .first<VoiceProfileRow>();
  return c.json({ voiceProfile: profile });
});

export default voice;
