import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { SpectatorView } from "./pages/SpectatorView";
import { initAppInsights } from "./services/appInsights";
import "./index.css";

// Initialize Application Insights early
initAppInsights();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/spectator" element={<SpectatorView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
