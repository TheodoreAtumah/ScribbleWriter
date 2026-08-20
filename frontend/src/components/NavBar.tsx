import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Mic, Type, SlidersHorizontal, BookOpen } from "lucide-react";
import { api, Book } from "../api";

/**
 * Three-button capture bar, echoing the reference: two actions merged into
 * one pill (Record / Type — both live inside Scribble, since recording is
 * not yet wired to transcription), and Setup isolated on its own to its
 * left, since it's a different kind of action ("configure", not "add").
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
        {/* Setup — isolated, left side */}
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

        {/* Book shelf shortcut */}
        <button
          onClick={() => navigate("/")}
          aria-label="Books"
          className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
            onShelf
              ? "bg-ink text-paper border-ink"
              : "bg-paper text-ink border-ink/15 shadow-book hover:border-ink/30"
          }`}
        >
          <BookOpen size={18} />
        </button>

        {/* Record / Type — merged pill, the Scribble capture entry point */}
        <div className="flex-1 h-14 rounded-full bg-ink shadow-book flex overflow-hidden">
          <button
            disabled
            title="Voice capture is coming soon"
            className="flex-1 flex items-center justify-center gap-2 text-paper/40 cursor-not-allowed text-sm font-medium"
          >
            <Mic size={16} />
            Record
          </button>
          <div className="w-px bg-paper/10 my-3" />
          <button
            onClick={goToScribble}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              onScribble ? "bg-brass text-ink" : "text-paper hover:bg-paper/10"
            }`}
          >
            <Type size={16} />
            Type
          </button>
        </div>
      </div>
    </nav>
  );
}
