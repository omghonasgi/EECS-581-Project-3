import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import Map from "./components/Map";
import Experience from "./components/Experience";

// Entry point. Routes are wired so Adam, Om, and Jal can each open their own
// page without stepping on one another. Fill in real auth-guarding later.
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/map" element={<Map />} />
        <Route path="/experience" element={<Experience />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
