import React from "react";

export default function Header({ theme, setTheme, themeVars }) {
  const today = new Date().toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="premium-header">
      <div className="premium-header-top">
        <div className="brand-section">
          <div className="brand-logo">✈</div>

          <div className="brand-content">
            <span className="brand-tag">AEROLOG PRO</span>

            <h1 className="brand-title">WORK LOG @ HORIZON</h1>
          </div>
        </div>

        <div className="header-actions">
          <div className="date-card">
            <span className="date-label">TODAY</span>
            <span className="date-value">{today}</span>
          </div>

          <button
            className="theme-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
        </div>
      </div>

      <div className="premium-status-bar">
        <span className="status-dot"></span>
        <span>BRAKES ASSEMBLY AND DISASSEMBLY</span>
      </div>
    </header>
  );
}
