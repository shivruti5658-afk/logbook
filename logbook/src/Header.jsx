import React from "react";

export default function Header({ theme, setTheme, themeVars }) {
  return (
    <div className="topbar" style={{ borderBottom: `3px solid ${themeVars.accent}` }}>
      <div className="topbar-inner">
        <div className="brand">
          <div className="brand-sub">✈ AEROLOG PRO</div>
          <div className="brand-title">Aviation Maintenance Logbook</div>
        </div>
        <div className="topbar-actions">
          <span className="topbar-date">{new Date().toLocaleDateString()}</span>
          <button
            className="primary-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </div>
      <div className="topbar-band">WORK LOG @ HORIZON</div>
    </div>
  );
}
