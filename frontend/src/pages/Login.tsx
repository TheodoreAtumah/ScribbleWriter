import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { ApiError } from "../api";
import { BookMarked } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-paper">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-ink flex items-center justify-center mb-4 shadow-book">
            <BookMarked size={24} className="text-brass" />
          </div>
          <h1 className="font-serif text-3xl text-ink">ScribbleWriter</h1>
          <p className="text-ink/50 text-sm mt-1 tracking-wide">Write On The Fly</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-ink/15 rounded-lg px-4 py-3 text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-ink/50 block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-ink/15 rounded-lg px-4 py-3 text-ink outline-none focus:border-brass focus:ring-2 focus:ring-brass/20"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-danger-dark bg-danger-soft border border-danger-border rounded-lg px-3 py-2">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-ink text-paper font-medium py-3 rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-ink/50 mt-6">
          New here?{" "}
          <Link to="/signup" className="text-brass-dark font-medium hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
