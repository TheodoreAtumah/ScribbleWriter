import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Inbox, ChevronDown, ChevronRight } from "lucide-react";
import { api, Book, Chapter } from "../api";
import EditableText from "../components/EditableText";

export default function BookDetail() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [unsortedCount, setUnsortedCount] = useState(0);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!bookId) return;
    api.getBook(bookId).then((res) => setBook(res.book));
    api.listChapters(bookId).then((res) => {
      setChapters(res.chapters);
      if (res.chapters[0]) setExpanded({ [res.chapters[0].id]: true });
    });
    api.listFragments(bookId).then((res) => setUnsortedCount(res.fragments.filter((f) => !f.sorted).length));
  }, [bookId]);

  if (!bookId) return null;

  async function addChapter() {
    const res = await api.createChapter(bookId!, "Untitled Chapter");
    setChapters((prev) => [...(prev ?? []), res.chapter]);
    setExpanded((e) => ({ ...e, [res.chapter.id]: true }));
  }

  async function updateChapterField(id: string, field: "title" | "summary" | "body", value: string) {
    const res = await api.updateChapter(id, { [field]: value });
    setChapters((prev) => (prev ? prev.map((c) => (c.id === id ? res.chapter : c)) : prev));
  }

  async function deleteChapter(id: string) {
    await api.deleteChapter(id);
    setChapters((prev) => (prev ? prev.filter((c) => c.id !== id) : prev));
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-ink/50 text-sm mb-6 hover:text-ink">
        <ArrowLeft size={15} /> Shelf
      </Link>

      {book && (
        <header className="mb-6">
          <EditableText
            as="h1"
            value={book.title}
            onSave={async (v) => {
              const res = await api.updateBook(book.id, { title: v });
              setBook(res.book);
            }}
            className="font-serif text-3xl text-ink leading-tight"
            placeholder="Untitled Book"
          />
          <EditableText
            value={book.author}
            onSave={async (v) => {
              const res = await api.updateBook(book.id, { author: v });
              setBook(res.book);
            }}
            className="text-ink/50 text-sm mt-1"
            placeholder="Add an author name…"
          />
        </header>
      )}

      {unsortedCount > 0 && (
        <button
          onClick={() => navigate(`/scribble/${bookId}`)}
          className="w-full flex items-center gap-3 bg-brass/10 border border-brass/30 rounded-lg px-4 py-3 mb-6 text-left hover:bg-brass/15 transition-colors"
        >
          <Inbox size={16} className="text-brass-dark shrink-0" />
          <span className="text-sm text-ink">
            <strong className="font-semibold">{unsortedCount}</strong> fragment{unsortedCount === 1 ? "" : "s"}{" "}
            waiting to be placed
          </span>
        </button>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs uppercase tracking-[0.15em] text-ink/40 font-medium">Manuscript</h2>
        <button
          onClick={addChapter}
          className="flex items-center gap-1 text-xs text-brass-dark font-medium hover:text-ink"
        >
          <Plus size={13} /> Chapter
        </button>
      </div>

      {chapters === null ? (
        <p className="text-ink/40 text-sm">Loading chapters…</p>
      ) : chapters.length === 0 ? (
        <div className="text-center py-14 border-2 border-dashed border-ink/10 rounded-lg">
          <p className="text-ink/40 text-sm mb-4 max-w-[18rem] mx-auto">
            No chapters yet. Add one, or place a fragment from Scribble and we'll create one for you.
          </p>
          <button
            onClick={addChapter}
            className="inline-flex items-center gap-1.5 bg-ink text-paper px-4 py-2 rounded-full text-sm font-medium hover:bg-ink-soft"
          >
            <Plus size={14} /> First Chapter
          </button>
        </div>
      ) : (
        <div className="space-y-3 pb-4">
          {chapters.map((ch, i) => (
            <ChapterCard
              key={ch.id}
              chapter={ch}
              index={i}
              open={!!expanded[ch.id]}
              onToggle={() => setExpanded((e) => ({ ...e, [ch.id]: !e[ch.id] }))}
              onUpdate={updateChapterField}
              onDelete={() => deleteChapter(ch.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChapterCard({
  chapter,
  index,
  open,
  onToggle,
  onUpdate,
  onDelete,
}: {
  chapter: Chapter;
  index: number;
  open: boolean;
  onToggle: () => void;
  onUpdate: (id: string, field: "title" | "summary" | "body", value: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-ink/10 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <button onClick={onToggle} className="text-ink/40 shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="text-ink/30 text-xs font-mono shrink-0 w-5">{String(index + 1).padStart(2, "0")}</span>
        <EditableText
          value={chapter.title}
          onSave={(v) => onUpdate(chapter.id, "title", v)}
          className="font-serif text-base text-ink flex-1"
          placeholder="Untitled Chapter"
        />
        <button onClick={onDelete} className="text-ink/25 hover:text-red-600 shrink-0">
          <Trash2 size={14} />
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pl-11 space-y-4 border-t border-ink/5 pt-4">
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/35 block mb-1">Summary</label>
            <EditableText
              value={chapter.summary}
              onSave={(v) => onUpdate(chapter.id, "summary", v)}
              multiline
              placeholder="What happens in this chapter, in a sentence or two…"
              className="text-sm text-ink/70"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wide text-ink/35 block mb-1">Body</label>
            <EditableText
              value={chapter.body}
              onSave={(v) => onUpdate(chapter.id, "body", v)}
              multiline
              placeholder="The chapter itself. Write directly, or place fragments here from Scribble…"
              className="text-sm leading-relaxed text-ink"
            />
          </div>
        </div>
      )}
    </div>
  );
}
