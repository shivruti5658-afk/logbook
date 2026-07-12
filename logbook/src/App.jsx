import { useEffect, useState } from "react";
import Logbook from "./Logbook";
import NumberGenerator from "./NumberGenerator";
import "./App.css";

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

  return <Logbook routePath={routePath} setRoutePath={setRoutePath} navigateTo={navigateTo} />;
}

export default App;
