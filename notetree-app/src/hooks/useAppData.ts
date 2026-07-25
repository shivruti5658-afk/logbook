import { useEffect, useState } from "react";
import type { AppData } from "../types";
import { loadData, saveData } from "../lib/storage";

export function useAppData() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [saveState, setSaveState] = useState<"Saved" | "Saving...">("Saved");

  useEffect(() => {
    setSaveState("Saving...");
    const t = window.setTimeout(() => {
      saveData(data);
      setSaveState("Saved");
    }, 350);
    return () => clearTimeout(t);
  }, [data]);

  useEffect(() => {
    document.documentElement.dataset.theme = data.theme;
  }, [data.theme]);

  return { data, setData, saveState };
}
