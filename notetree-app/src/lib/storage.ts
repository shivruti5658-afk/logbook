import type { AppData } from "../types";

const KEY = "notetree:data:v1";

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { notes: [], folders: [], theme: "dark" };
}

export function saveData(data: AppData) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
