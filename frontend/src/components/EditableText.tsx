import { useState, useEffect, useRef } from "react";
import { Pencil } from "lucide-react";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3";
}

/**
 * The one inline-edit primitive used everywhere in ScribbleWriter:
 * click styled text -> becomes an input/textarea -> saves on blur ->
 * reverts to styled text. No separate save button. Every field this
 * wraps writes through to the API the moment it loses focus.
 */
export default function EditableText({
  value,
  onSave,
  placeholder = "Click to write…",
  multiline = false,
  className = "",
  as: Tag = "div",
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value || "");
  }, [value, editing]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
      if (multiline) autosize(ref.current);
    }
  }, [editing]);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  async function commit() {
    setEditing(false);
    if (draft === value) return;
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    const commonProps = {
      ref: ref as any,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        setDraft(e.target.value);
        if (multiline) autosize(e.target as HTMLTextAreaElement);
      },
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          commit();
        }
        if (e.key === "Escape") {
          setDraft(value || "");
          setEditing(false);
        }
      },
      className: `w-full bg-white border border-brass/50 rounded-md px-3 py-2 text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20 resize-none transition-shadow ${className}`,
    };

    return multiline ? (
      <textarea {...commonProps} rows={3} />
    ) : (
      <input {...commonProps} type="text" />
    );
  }

  return (
    <Tag
      onClick={() => setEditing(true)}
      className={`group cursor-text rounded-md -mx-1 px-1 transition-colors hover:bg-ink/5 ${
        value ? "" : "text-ink/40 italic"
      } ${saving ? "opacity-50" : ""} ${className}`}
    >
      <span className="whitespace-pre-wrap">{value || placeholder}</span>
      <Pencil
        size={12}
        className="inline-block ml-1.5 mb-0.5 opacity-0 group-hover:opacity-40 transition-opacity"
      />
    </Tag>
  );
}
