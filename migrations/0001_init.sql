-- Users & sessions
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX idx_sessions_user ON sessions(user_id);

-- One voice profile per user: the writing sample + notes that anchor
-- every AI placement/rewrite in the user's own tone.
CREATE TABLE voice_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  sample_text TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);

-- Books: the shelf. Each user can have many.
CREATE TABLE books (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Book',
  author TEXT NOT NULL DEFAULT '',
  cover_color TEXT NOT NULL DEFAULT '#1B2340',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_books_user ON books(user_id);

-- Chapters: the structured manuscript body of a book.
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Chapter',
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_chapters_book ON chapters(book_id);

-- Fragments: the Scribble inbox. Raw, unstructured, until placed.
CREATE TABLE fragments (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'typed', -- 'typed' | 'upload'
  sorted INTEGER NOT NULL DEFAULT 0,     -- 0/1 boolean
  placed_chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_fragments_book ON fragments(book_id);
CREATE INDEX idx_fragments_sorted ON fragments(book_id, sorted);
