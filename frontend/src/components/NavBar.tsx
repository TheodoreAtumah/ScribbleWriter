import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { PenLine, SlidersHorizontal, BookOpen } from "lucide-react";
import { api } from "../api";

/**
 * Two-zone pill (Books / Scribble) plus an isolated Setup button on the
 * right. Books and Scribble are the app's two content zones; Record and
 * Type live inside the Scribble page itself as capture modes, not here.
 */
export default function NavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [lastBookId, setLastBookId] = useState<string | null>(null);

  useEffect(() => {
    // Track whichever book the user most recently touched, so the Scribble
    // shortcut always has somewhere sensible to go even from the shelf.
    const bookIdInUrl = params.bookId;
    if (bookIdInUrl) {
      setLastBookId(bookIdInUrl);
      return;
    }
    if (!lastBookId) {
      api
        .listBooks()
        .then((res) => {
          if (res.books[0]) setLastBookId(res.books[0].id);
        })
        .catch(() => {});
    }
  }, [params.bookId]);

  const onSetup = location.pathname === "/setup";
  const onScribble = location.pathname.startsWith("/scribble");
  const onShelf = location.pathname === "/" || location.pathname.startsWith("/book/");

  function goToScribble() {
    if (lastBookId) navigate(`/scribble/${lastBookId}`);
    else navigate("/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 pb-6 pt-3 px-4 bg-gradient-to-t from-paper via-paper to-transparent">
      <div className="max-w-md mx-auto flex items-center gap-3">
        {/* Books / Scribble — merged pill, the two content zones */}
        <div className="flex-1 h-14 rounded-full bg-ink shadow-book flex overflow-hidden">
          <button
            onClick={() => navigate("/")}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              onShelf ? "bg-brass text-ink" : "text-paper hover:bg-paper/10"
            }`}
          >
            <BookOpen size={16} />
            Books
          </button>
          <div className="w-px bg-paper/10 my-3" />
          <button
            onClick={goToScribble}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              onScribble ? "bg-brass text-ink" : "text-paper hover:bg-paper/10"
            }`}
          >
            <PenLine size={16} />
            Scribble
          </button>
        </div>

        {/* Setup — isolated, on the right */}
        <button
          onClick={() => navigate("/setup")}
          aria-label="Setup"
          className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
            onSetup
              ? "bg-ink text-paper border-ink"
              : "bg-paper text-ink border-ink/15 shadow-book hover:border-ink/30"
          }`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </nav>
  );
}