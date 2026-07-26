import { useState } from "react";

import { Menu, Plus } from "lucide-react";

import { Sidebar } from "./components/Sidebar";

import { Editor } from "./components/Editor";

import { useAppData } from "./hooks/useAppData";

import { uid } from "./lib/id";

import type { Note } from "./types";

import "./NoteTree.css";

export default function NoteTree({
  navigateTo,
}: {
  navigateTo: (path: string) => void;
}) {
  const { data, setData, saveState } = useAppData();

  const [selectedId, setSelectedId] = useState<string | null>(
    data.notes[0]?.id ?? null,
  );

  const [query, setQuery] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selected = data.notes.find((note) => note.id === selectedId);

  function newNote() {
    const now = new Date().toISOString();

    const note: Note = {
      id: uid(),

      folderId: null,

      title: "Untitled",

      nodes: [
        {
          id: uid(),

          parentId: null,

          content: "",

          type: "bullet",

          position: 0,

          collapsed: false,
        },
      ],

      createdAt: now,

      updatedAt: now,

      pinned: false,

      archived: false,
    };

    setData((current) => ({
      ...current,

      notes: [note, ...current.notes],
    }));

    setSelectedId(note.id);

    setSidebarOpen(false);
  }

  function newFolder() {
    const name = window.prompt("Folder name");

    if (!name?.trim()) {
      return;
    }

    setData((current) => ({
      ...current,

      folders: [
        ...current.folders,

        {
          id: uid(),

          parentId: null,

          name: name.trim(),
        },
      ],
    }));
  }

  function updateNote(note: Note) {
    setData((current) => ({
      ...current,

      notes: current.notes.map((item) => (item.id === note.id ? note : item)),
    }));
  }

  function deleteNote() {
    if (!selected) {
      return;
    }

    const confirmed = window.confirm(`Delete "${selected.title}"?`);

    if (!confirmed) {
      return;
    }

    const remaining = data.notes.filter((note) => note.id !== selected.id);

    setData((current) => ({
      ...current,

      notes: current.notes.filter((note) => note.id !== selected.id),
    }));

    setSelectedId(remaining[0]?.id ?? null);
  }

  function toggleTheme() {
    setData((current) => ({
      ...current,

      theme: current.theme === "dark" ? "light" : "dark",
    }));
  }

  return (
    <div className="appShell">
      <Sidebar
        data={data}
        selectedId={selectedId}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        onSelect={setSelectedId}
        onNewNote={newNote}
        onNewFolder={newFolder}
        query={query}
        setQuery={setQuery}
        onToggleTheme={toggleTheme}
      />

      <section className="mainArea">
        <header className="mobileTopBar">
          <button
            type="button"
            className="mobileMenuButton"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={21} />
          </button>

          <strong>NoteTree</strong>

          <button
            type="button"
            className="mobileNewButton"
            onClick={newNote}
            aria-label="Create note"
          >
            <Plus size={20} />
          </button>
        </header>

        {selected ? (
          <Editor
            note={selected}
            saveState={saveState}
            onUpdate={updateNote}
            onDelete={deleteNote}
          />
        ) : (
          <main className="welcome">
            <div className="welcomeCard">
              <div className="welcomeLogo">N</div>

              <h1>Organise ideas naturally.</h1>

              <p>
                Create structured notes using nested bullets and keyboard-first
                navigation.
              </p>

              <button
                type="button"
                className="newNoteButton welcomeButton"
                onClick={newNote}
              >
                <Plus size={18} />
                Create your first note
              </button>
            </div>
          </main>
        )}
      </section>
    </div>
  );
}
