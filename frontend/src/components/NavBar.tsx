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
        {/* Books / Scribble — segmented control, echoing the Type/Record
            toggle inside Scribble: a recessed track with a raised, softly
            lit thumb behind the active option. When Setup is active, this
            whole pill recedes to a faint outline instead of competing with
            it, so only one control ever reads as "the current one". */}
        <div
          className={`relative flex-1 h-14 rounded-full p-1.5 flex transition-colors duration-200 ${
            onSetup ? "bg-transparent border border-ink/10" : "bg-ink shadow-book"
          }`}
        >
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-full transition-all duration-200 ease-out ${
              onSetup ? "bg-transparent shadow-none" : "bg-ink-soft shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
            }`}
            style={{ transform: onScribble ? "translateX(calc(100% + 0.375rem))" : "translateX(0)" }}
          />
          <button
            onClick={() => navigate("/")}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              onSetup
                ? "text-ink/30 hover:text-ink/50"
                : onShelf
                ? "text-paper"
                : "text-paper/45 hover:text-paper/70"
            }`}
          >
            <BookOpen size={16} />
            Books
          </button>
          <button
            onClick={goToScribble}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              onSetup
                ? "text-ink/30 hover:text-ink/50"
                : onScribble
                ? "text-paper"
                : "text-paper/45 hover:text-paper/70"
            }`}
          >
            <PenLine size={16} />
            Scribble
          </button>
        </div>

        {/* Setup — isolated, on the right. Active state stays a quiet,
            neutral tint (no brass, no full-ink fill) so it never reads
            as the same control as the Books/Scribble segmented pill. */}
        <button
          onClick={() => navigate("/setup")}
          aria-label="Setup"
          className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${
            onSetup
              ? "bg-ink/10 text-ink border-ink/30"
              : "bg-paper text-ink border-ink/15 shadow-book hover:border-ink/30"
          }`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </nav>
  );
}
