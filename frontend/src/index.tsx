import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Map from "./components/Map";
import Experience from "./components/Experience";
import "./index.css";

// Entry point. Routes are wired so Adam, Om, and Jal can each open their own
// page without stepping on one another. Fill in real auth-guarding later.
//
// The nav below is a temporary scaffold link bar so teammates can click into
// each blank page while they build it. Remove once real navigation lands.
function DevNav() {
  const linkStyle = {
    color: "blue",
    textDecoration: "underline",
    marginRight: "1rem",
  };
  return (
    <nav style={{ padding: "1rem" }}>
      <Link to="/login" style={linkStyle}>Login</Link>
      <Link to="/map" style={linkStyle}>Map</Link>
      <Link to="/experience" style={linkStyle}>Experience</Link>
    </nav>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <DevNav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/map" element={<Map />} />
        <Route path="/experience" element={<Experience />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isLoggedIn = Boolean(
    localStorage.getItem("triptrace_current_user")
  );

  return isLoggedIn ? children : <Navigate to="/login" replace />;
}
