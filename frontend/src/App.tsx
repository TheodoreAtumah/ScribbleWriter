import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import Shelf from "./pages/Shelf";
import BookDetail from "./pages/BookDetail";
import Scribble from "./pages/Scribble";
import Setup from "./pages/Setup";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NavBar from "./components/NavBar";

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-paper">
        <p className="font-serif text-ink/50 tracking-wide animate-pulse">Loading ScribbleWriter…</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppShell() {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <div className="flex-1 pb-28">
        <Routes>
          <Route path="/" element={<Gate><Shelf /></Gate>} />
          <Route path="/book/:bookId" element={<Gate><BookDetail /></Gate>} />
          <Route path="/scribble/:bookId" element={<Gate><Scribble /></Gate>} />
          <Route path="/setup" element={<Gate><Setup /></Gate>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
      <NavBarGate />
    </div>
  );
}

function NavBarGate() {
  const { user } = useAuth();
  if (!user) return null;
  return <NavBar />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
