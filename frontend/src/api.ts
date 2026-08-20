// Thin fetch wrapper around the Worker API. Every call includes credentials
// so the session cookie is sent; every call throws a readable Error on
// non-2xx so callers can catch and display c.message.

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_color: string;
  created_at: number;
  updated_at: number;
}

export interface Chapter {
  id: string;
  book_id: string;
  title: string;
  summary: string;
  body: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface Fragment {
  id: string;
  book_id: string;
  text: string;
  source: string;
  sorted: number;
  placed_chapter_id: string | null;
  created_at: number;
}

export interface VoiceProfile {
  user_id: string;
  sample_text: string;
  notes: string;
  updated_at: number;
}

export interface PlacementProposal {
  targetChapterId: string | null;
  newChapterTitle: string | null;
  rationale: string;
  rewrittenText: string;
}

class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  // auth
  signup: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<{ user: { id: string; email: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: { id: string; email: string } }>("/auth/me"),

  // books
  listBooks: () => request<{ books: Book[] }>("/books"),
  createBook: (title: string, author?: string) =>
    request<{ book: Book }>("/books", { method: "POST", body: JSON.stringify({ title, author }) }),
  getBook: (id: string) => request<{ book: Book }>(`/books/${id}`),
  updateBook: (id: string, fields: Partial<Pick<Book, "title" | "author">>) =>
    request<{ book: Book }>(`/books/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  deleteBook: (id: string) => request<{ ok: true }>(`/books/${id}`, { method: "DELETE" }),

  // chapters
  listChapters: (bookId: string) => request<{ chapters: Chapter[] }>(`/chapters/book/${bookId}`),
  createChapter: (bookId: string, title?: string) =>
    request<{ chapter: Chapter }>(`/chapters/book/${bookId}`, {
      method: "POST",
      body: JSON.stringify({ title }),
    }),
  updateChapter: (id: string, fields: Partial<Pick<Chapter, "title" | "summary" | "body">>) =>
    request<{ chapter: Chapter }>(`/chapters/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  reorderChapters: (bookId: string, order: { id: string; order: number }[]) =>
    request<{ ok: true }>(`/chapters/book/${bookId}/reorder`, {
      method: "POST",
      body: JSON.stringify({ order }),
    }),
  deleteChapter: (id: string) => request<{ ok: true }>(`/chapters/${id}`, { method: "DELETE" }),

  // fragments
  listFragments: (bookId: string) => request<{ fragments: Fragment[] }>(`/fragments/book/${bookId}`),
  createFragment: (bookId: string, text: string, source: "typed" | "upload" = "typed") =>
    request<{ fragment: Fragment }>(`/fragments/book/${bookId}`, {
      method: "POST",
      body: JSON.stringify({ text, source }),
    }),
  updateFragment: (id: string, fields: Partial<Pick<Fragment, "text">> & { sorted?: boolean }) =>
    request<{ fragment: Fragment }>(`/fragments/${id}`, { method: "PATCH", body: JSON.stringify(fields) }),
  deleteFragment: (id: string) => request<{ ok: true }>(`/fragments/${id}`, { method: "DELETE" }),

  // voice
  getVoiceProfile: () => request<{ voiceProfile: VoiceProfile }>("/voice"),
  updateVoiceProfile: (fields: Partial<Pick<VoiceProfile, "sample_text" | "notes">>) =>
    request<{ voiceProfile: VoiceProfile }>("/voice", {
      method: "PATCH",
      body: JSON.stringify({ sampleText: fields.sample_text, notes: fields.notes }),
    }),

  // ai
  proposePlacement: (fragmentId: string) =>
    request<{ proposal: PlacementProposal; chapters: Chapter[] }>(`/ai/propose/${fragmentId}`, {
      method: "POST",
    }),
  commitPlacement: (
    fragmentId: string,
    payload: { targetChapterId: string | null; newChapterTitle: string | null; rewrittenText: string }
  ) =>
    request<{ chapter: Chapter }>(`/ai/commit/${fragmentId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export { ApiError };
