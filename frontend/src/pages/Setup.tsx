import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, UploadCloud, FileText } from "lucide-react";
import { api, VoiceProfile } from "../api";
import { useAuth } from "../AuthContext";
import EditableText from "../components/EditableText";

export default function Setup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getVoiceProfile().then((res) => setVoice(res.voiceProfile));
  }, []);

  function flash() {
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1200);
  }

  async function saveVoice(fields: Partial<Pick<VoiceProfile, "sample_text" | "notes">>) {
    const res = await api.updateVoiceProfile(fields);
    setVoice(res.voiceProfile);
    flash();
  }

  async function handleFile(file: File) {
    const text = await file.text();
    await saveVoice({ sample_text: text });
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="max-w-md mx-auto px-5 pt-10">
      <header className="mb-8">
        <h1 className="font-serif text-3xl text-ink">Setup</h1>
        <p className="text-ink/50 text-sm mt-1">{user?.email}</p>
      </header>

      <section className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-[0.15em] text-ink/40 font-medium">Your Voice</h2>
          <span className={`text-[11px] text-brass-dark transition-opacity ${saveFlash ? "opacity-100" : "opacity-0"}`}>
            ✓ saved
          </span>
        </div>
        <p className="text-ink/50 text-sm mb-4">
          Paste or upload a short sample of your own writing — a few paragraphs is enough. Every AI placement
          and rewrite in ScribbleWriter uses this to stay in your tone, not a generic one.
        </p>

        <div className="bg-white border border-ink/10 rounded-lg p-4 mb-3">
          <label className="text-[10px] uppercase tracking-wide text-ink/35 block mb-2">Writing sample</label>
          <EditableText
            value={voice?.sample_text ?? ""}
            onSave={(v) => saveVoice({ sample_text: v })}
            multiline
            placeholder="Paste a paragraph or two of something you've written before…"
            className="text-sm leading-relaxed text-ink"
          />
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border border-ink/10 rounded-lg py-4 text-sm text-ink/50 hover:border-brass hover:text-brass-dark transition-colors"
        >
          <UploadCloud size={16} />
          Or upload a .txt file instead
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        <div className="bg-white border border-ink/10 rounded-lg p-4 mt-3">
          <label className="text-[10px] uppercase tracking-wide text-ink/35 block mb-2">
            Notes on your style <span className="normal-case text-ink/30">(optional)</span>
          </label>
          <EditableText
            value={voice?.notes ?? ""}
            onSave={(v) => saveVoice({ notes: v })}
            multiline
            placeholder="e.g. short sentences, dry humor, avoid semicolons…"
            className="text-sm text-ink"
          />
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-xs uppercase tracking-[0.15em] text-ink/40 font-medium mb-3">Account</h2>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 justify-center border border-ink/10 rounded-lg py-3 text-sm text-ink/60 hover:border-danger/40 hover:text-danger transition-colors"
        >
          <LogOut size={15} /> Sign out
        </button>
      </section>

      <p className="text-center text-[11px] text-ink/30 flex items-center justify-center gap-1.5">
        <FileText size={11} /> ScribbleWriter — Write On The Fly
      </p>
    </div>
  );
}
