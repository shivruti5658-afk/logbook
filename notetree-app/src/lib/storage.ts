import type { AppData } from "../types";

const STORAGE_KEY = "notetree:data:v1";

const DEFAULT_DATA: AppData = {
  notes: [],
  folders: [],
  theme: "dark",
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_DATA;
    }

    const parsed = JSON.parse(raw) as AppData;

    return {
      notes: parsed.notes ?? [],
      folders: parsed.folders ?? [],
      theme: parsed.theme ?? "dark",
    };
  } catch (error) {
    console.error("Failed to load NoteTree data:", error);

    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save NoteTree data:", error);
  }
}
