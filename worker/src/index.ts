import { Hono } from "hono";
import authRoutes from "./routes/auth";
import bookRoutes from "./routes/books";
import chapterRoutes from "./routes/chapters";
import fragmentRoutes from "./routes/fragments";
import voiceRoutes from "./routes/voice";
import aiRoutes from "./routes/ai";
import type { Env, Variables } from "./types";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.route("/api/auth", authRoutes);
app.route("/api/books", bookRoutes);
app.route("/api/chapters", chapterRoutes);
app.route("/api/fragments", fragmentRoutes);
app.route("/api/voice", voiceRoutes);
app.route("/api/ai", aiRoutes);

app.notFound((c) => c.json({ error: "Not found" }, 404));

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return app.fetch(request, env, ctx);
    }
    // Static assets (the built frontend) handle everything else, including
    // SPA fallback to index.html for client-side routes.
    return env.ASSETS.fetch(request);
  },
};
