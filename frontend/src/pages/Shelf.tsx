import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Puzzle } from "lucide-react";
import { api, Book } from "../api";

export default function Shelf() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listBooks().then((res) => setBooks(res.books));
  }, []);

  async function createBook() {
    setCreating(true);
    try {
      const res = await api.createBook("Untitled Book");
      navigate(`/book/${res.book.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-ink leading-tight">
          Here, your fragments
          <br />
          become a book
        </h1>
        <p className="text-ink/50 text-sm mt-2">Write On The Fly!</p>
      </header>

      {books === null ? (
        <p className="text-ink/40 text-sm">Loading your shelf…</p>
      ) : books.length === 0 ? (
        <EmptyShelf onCreate={createBook} creating={creating} />
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {books.map((book) => (
            <BookCover key={book.id} book={book} onClick={() => navigate(`/book/${book.id}`)} />
          ))}
          <button
            onClick={createBook}
            disabled={creating}
            className="aspect-[3/4] rounded-lg border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2 text-ink/40 hover:border-brass hover:text-brass-dark transition-colors"
          >
            <Plus size={22} />
            <span className="text-xs font-medium">New Book</span>
          </button>
        </div>
      )}
    </div>
  );
}

function BookCover({ book, onClick }: { book: Book; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group aspect-[3/4] rounded-lg shadow-book flex flex-col items-center justify-center text-center px-4 relative overflow-hidden transition-transform hover:-translate-y-1"
      style={{ backgroundColor: book.cover_color }}
    >
      <Puzzle size={18} className="absolute top-4 right-4 text-paper/25" />
      <span className="font-serif text-lg text-paper leading-snug">{book.title}</span>
      {book.author && <span className="text-paper/50 text-xs mt-1.5">by {book.author}</span>}
      <div className="absolute inset-x-0 bottom-0 h-1.5 bg-brass/70" />
    </button>
  );
}

function EmptyShelf({ onCreate, creating }: { onCreate: () => void; creating: boolean }) {
  return (
    <div className="text-center py-16">
      <div className="w-40 h-52 mx-auto rounded-lg bg-ink/5 border-2 border-dashed border-ink/15 flex items-center justify-center mb-6">
        <Puzzle size={28} className="text-ink/20" />
      </div>
      <p className="text-ink/50 text-sm mb-5 max-w-[22rem] mx-auto">
        Your shelf is empty. Start a book, then drop your rough thoughts into Scribble — we'll help you find
        where they belong.
      </p>
      <button
        onClick={onCreate}
        disabled={creating}
        className="inline-flex items-center gap-2 bg-ink text-paper px-5 py-2.5 rounded-full font-medium text-sm hover:bg-ink-soft transition-colors disabled:opacity-50"
      >
        <Plus size={16} />
        {creating ? "Creating…" : "Start your first book"}
      </button>
    </div>
  );
}
