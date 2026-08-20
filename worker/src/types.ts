export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY: string;
  SESSION_SECRET: string;
};

export type Variables = {
  userId: string;
};

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  created_at: number;
}

export interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string;
  cover_color: string;
  created_at: number;
  updated_at: number;
}

export interface ChapterRow {
  id: string;
  book_id: string;
  title: string;
  summary: string;
  body: string;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface FragmentRow {
  id: string;
  book_id: string;
  text: string;
  source: string;
  sorted: number;
  placed_chapter_id: string | null;
  created_at: number;
}

export interface VoiceProfileRow {
  user_id: string;
  sample_text: string;
  notes: string;
  updated_at: number;
}
