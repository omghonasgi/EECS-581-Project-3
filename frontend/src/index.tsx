import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import Map from "./components/Map";
import Experience from "./components/Experience";
import Profile from "./components/Profile";
import { AuthProvider, useAuth } from "./lib/AuthProvider";
import "./index.css";

// Entry point. Routes are wired so Adam, Om, and Jal can each open their own
// page without stepping on one another.
//
// The nav below is a temporary scaffold link bar so teammates can click into
// each page while they build it. Remove once real navigation lands.
function DevNav() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const linkStyle = {
    color: "blue",
    textDecoration: "underline",
    marginRight: "1rem",
  };

  // Req 13 Logout (Arin Shah): end the Supabase session and return to /login.
  async function handleLogout() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <nav style={{ padding: "1rem" }}>
      {!loading && (session ? (
        <>
          <Link to="/map" style={linkStyle}>Map</Link>
          <Link to="/profile" style={linkStyle}>Profile</Link>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </>
      ) : (
        <Link to="/login" style={linkStyle}>Login</Link>
      ))}
    </nav>
  );
}

// Only lets a signed-in user through; uses the live Supabase session.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <p style={{ padding: "1rem" }}>Loading…</p>;
  return session ? <>{children}</> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <DevNav />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <Map />
              </ProtectedRoute>
            }
          />
          <Route
            path="/experience"
            element={
              <ProtectedRoute>
                <Experience />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
