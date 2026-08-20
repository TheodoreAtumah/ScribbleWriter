import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Trash2, Check, X, Loader2 } from "lucide-react";
import { api, Book, Fragment, Chapter, PlacementProposal, ApiError } from "../api";

export default function Scribble() {
  const { bookId } = useParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [fragments, setFragments] = useState<Fragment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!bookId) return;
    api.getBook(bookId).then((res) => setBook(res.book));
    refreshFragments();
  }, [bookId]);

  function refreshFragments() {
    if (!bookId) return;
    api.listFragments(bookId).then((res) => setFragments(res.fragments));
  }

  async function addFragment() {
    if (!draft.trim() || !bookId) return;
    setSubmitting(true);
    try {
      const res = await api.createFragment(bookId, draft.trim(), "typed");
      setFragments((prev) => [res.fragment, ...(prev ?? [])]);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteFragment(id: string) {
    await api.deleteFragment(id);
    setFragments((prev) => (prev ? prev.filter((f) => f.id !== id) : prev));
  }

  function onPlaced(fragmentId: string) {
    setFragments((prev) =>
      prev ? prev.map((f) => (f.id === fragmentId ? { ...f, sorted: 1 } : f)) : prev
    );
  }

  if (!bookId) return null;

  const unsorted = fragments?.filter((f) => !f.sorted) ?? [];
  const sorted = fragments?.filter((f) => f.sorted) ?? [];

  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <Link to={`/book/${bookId}`} className="inline-flex items-center gap-1.5 text-ink/50 text-sm mb-6 hover:text-ink">
        <ArrowLeft size={15} /> {book?.title ?? "Back"}
      </Link>

      <header className="mb-6">
  <h1 className="font-serif text-2xl text-ink">Scribble</h1>
  {book && (
    <p className="text-brass-dark text-sm font-medium mt-0.5">for {book.title}</p>
  )}
  <p className="text-ink/50 text-sm mt-2">
    Drop anything here — a line, a memory, a half-formed idea. Sort it into the book when you're ready.
  </p>
</header>

      <div className="bg-white border border-ink/10 rounded-lg p-3 mb-8">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Start typing…"
          rows={4}
          className="w-full resize-none outline-none text-sm text-ink placeholder:text-ink/30"
        />
        <div className="flex justify-end mt-1">
          <button
            onClick={addFragment}
            disabled={!draft.trim() || submitting}
            className="bg-ink text-paper text-sm font-medium px-4 py-2 rounded-full disabled:opacity-30 hover:bg-ink-soft transition-colors"
          >
            Drop it in
          </button>
        </div>
      </div>

      {fragments === null ? (
        <p className="text-ink/40 text-sm">Loading fragments…</p>
      ) : (
        <>
          <FragmentSection
            label={`Unsorted (${unsorted.length})`}
            fragments={unsorted}
            bookId={bookId}
            onDelete={deleteFragment}
            onPlaced={onPlaced}
            emptyText="Nothing waiting — you're all caught up."
          />
          {sorted.length > 0 && (
            <FragmentSection
              label={`Placed (${sorted.length})`}
              fragments={sorted}
              bookId={bookId}
              onDelete={deleteFragment}
              onPlaced={onPlaced}
              muted
            />
          )}
        </>
      )}
    </div>
  );
}

function FragmentSection({
  label,
  fragments,
  bookId,
  onDelete,
  onPlaced,
  emptyText,
  muted = false,
}: {
  label: string;
  fragments: Fragment[];
  bookId: string;
  onDelete: (id: string) => void;
  onPlaced: (id: string) => void;
  emptyText?: string;
  muted?: boolean;
}) {
  return (
    <div className="mb-8">
      <h2 className="text-xs uppercase tracking-[0.15em] text-ink/40 font-medium mb-3">{label}</h2>
      {fragments.length === 0 && emptyText ? (
        <p className="text-ink/35 text-sm italic">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {fragments.map((f) => (
            <FragmentCard key={f.id} fragment={f} bookId={bookId} onDelete={onDelete} onPlaced={onPlaced} muted={muted} />
          ))}
        </div>
      )}
    </div>
  );
}

function FragmentCard({
  fragment,
  bookId,
  onDelete,
  onPlaced,
  muted,
}: {
  fragment: Fragment;
  bookId: string;
  onDelete: (id: string) => void;
  onPlaced: (id: string) => void;
  muted: boolean;
}) {
  const [proposing, setProposing] = useState(false);
  const [proposal, setProposal] = useState<PlacementProposal | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [committing, setCommitting] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  async function requestPlacement() {
    setProposing(true);
    setError(null);
    try {
      const res = await api.proposePlacement(fragment.id);
      setProposal(res.proposal);
      setChapters(res.chapters);
      setEditedText(res.proposal.rewrittenText);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't reach the AI. Please try again.");
    } finally {
      setProposing(false);
    }
  }

  async function confirmPlacement() {
    if (!proposal) return;
    setCommitting(true);
    try {
      await api.commitPlacement(fragment.id, {
        targetChapterId: proposal.targetChapterId,
        newChapterTitle: proposal.newChapterTitle,
        rewrittenText: editedText,
      });
      onPlaced(fragment.id);
      setProposal(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save the placement. Please try again.");
    } finally {
      setCommitting(false);
    }
  }

  const targetChapter = chapters.find((c) => c.id === proposal?.targetChapterId);

  return (
    <div className={`border rounded-lg p-4 ${muted ? "bg-ink/[0.02] border-ink/5" : "bg-white border-ink/10"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-sm whitespace-pre-wrap flex-1 ${muted ? "text-ink/50" : "text-ink"}`}>{fragment.text}</p>
        {!fragment.sorted && (
          confirmingDelete ? (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onDelete(fragment.id)}
                className="text-[11px] font-medium text-red-700 hover:text-red-800"
              >
                Delete?
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                className="text-ink/40 hover:text-ink"
                aria-label="Cancel delete"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-ink/25 hover:text-red-600 shrink-0"
              aria-label="Delete fragment"
            >
              <Trash2 size={14} />
            </button>
          )
        )}
      </div>

      <div className="flex items-center justify-between mt-3">
        <span className="text-[11px] text-ink/30">{new Date(fragment.created_at).toLocaleString()}</span>
        {!fragment.sorted && !proposal && (
          <button
            onClick={requestPlacement}
            disabled={proposing}
            className="flex items-center gap-1.5 text-xs font-medium text-brass-dark hover:text-ink disabled:opacity-50"
          >
            {proposing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {proposing ? "Finding its place…" : "Place in Book"}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-700 mt-2">{error}</p>}

      {proposal && (
        <div className="mt-4 pt-4 border-t border-ink/10 space-y-3">
          <div className="flex items-center gap-1.5 text-xs text-ink/50">
            <Sparkles size={12} className="text-brass-dark" />
            <span>
              {targetChapter ? (
                <>
                  Goes in <strong className="text-ink font-medium">{targetChapter.title}</strong>
                </>
              ) : (
                <>
                  Suggests a new chapter: <strong className="text-ink font-medium">{proposal.newChapterTitle}</strong>
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-ink/40 italic">{proposal.rationale}</p>

          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/35 block mb-1">
              Rewritten in your voice — edit before placing
            </label>
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              rows={5}
              className="w-full text-sm text-ink bg-paper-soft border border-ink/10 rounded-md p-3 outline-none focus:border-brass resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={confirmPlacement}
              disabled={committing || !editedText.trim()}
              className="flex items-center gap-1.5 bg-ink text-paper text-sm font-medium px-4 py-2 rounded-full hover:bg-ink-soft disabled:opacity-50"
            >
              {committing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {committing ? "Placing…" : "Confirm placement"}
            </button>
            <button
              onClick={() => setProposal(null)}
              disabled={committing}
              className="flex items-center gap-1.5 text-ink/50 text-sm px-3 py-2 hover:text-ink"
            >
              <X size={14} /> Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}