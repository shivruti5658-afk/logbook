import { useEffect, useState } from "react";
import NumberGenerator from "./NumberGenerator";
import "./App.css";

function HomePage({ navigateTo }) {
  return (
    <main className="app-home">
      <section className="app-home-hero">
        <span className="app-home-eyebrow">AEROLOG PRO</span>
        <h1>Your aerospace workspace</h1>
        <p>Choose an app to manage your work, sessions, and future tools.</p>
      </section>
      <section className="app-launcher" aria-label="Applications">
        {false && <button className="app-launch-card" type="button" onClick={() => navigateTo("/entries")}>
          <span className="app-launch-icon" aria-hidden="true">LB</span>
          <span className="app-launch-content"><strong>Logbook</strong><small>Record and manage aircraft maintenance work.</small></span>
          <span className="app-launch-arrow" aria-hidden="true">→</span>
        </button>}
        <button className="app-launch-card" type="button" onClick={() => navigateTo("/number-generator")}>
          <span className="app-launch-icon" aria-hidden="true">NG</span>
          <span className="app-launch-content"><strong>Number Generator</strong><small>Create tracked number sessions with timers and remarks.</small></span>
          <span className="app-launch-arrow" aria-hidden="true">→</span>
        </button>
        <div className="app-launch-card app-launch-card--future">
          <span className="app-launch-icon" aria-hidden="true">+</span>
          <span className="app-launch-content"><strong>Future Apps</strong><small>New aerospace tools will appear here.</small></span>
          <span className="app-launch-badge">Coming soon</span>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [routePath, setRoutePath] = useState(window.location.pathname);

  const navigateTo = (path) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  useEffect(() => {
    const updateRoute = () => setRoutePath(window.location.pathname);
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);

  if (routePath === "/number-generator") {
    return <NumberGenerator navigateTo={navigateTo} />;
  }

  if (routePath === "/") {
    return <HomePage navigateTo={navigateTo} />;
  }

  return <HomePage navigateTo={navigateTo} />;
}

export default App;
