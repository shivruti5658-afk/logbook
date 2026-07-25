import {
  FileText,
  Folder as FolderIcon,
  Moon,
  Plus,
  Search,
  Sun,
  X,
} from "lucide-react";

import type { AppData } from "../types";

type Props = {
  data: AppData;

  selectedId: string | null;

  mobileOpen: boolean;

  onCloseMobile: () => void;

  onSelect: (id: string) => void;

  onNewNote: () => void;

  onNewFolder: () => void;

  onToggleTheme: () => void;

  query: string;

  setQuery: (query: string) => void;
};

export function Sidebar({
  data,
  selectedId,
  mobileOpen,
  onCloseMobile,
  onSelect,
  onNewNote,
  onNewFolder,
  onToggleTheme,
  query,
  setQuery,
}: Props) {
  const notes = data.notes
    .filter((note) => !note.archived)
    .filter((note) => {
      const content = note.nodes.map((node) => node.content).join(" ");

      const searchable = `${note.title} ${content}`.toLowerCase();

      return searchable.includes(query.toLowerCase());
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return +new Date(b.updatedAt) - +new Date(a.updatedAt);
    });

  function selectNote(id: string) {
    onSelect(id);

    onCloseMobile();
  }

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebarOverlay"
          onClick={onCloseMobile}
          aria-label="Close sidebar"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? "sidebarOpen" : ""}`}>
        <div className="sidebarHeader">
          <div className="brand">
            <div className="brandMark">N</div>

            <div className="brandText">
              <strong>NoteTree</strong>

              <small>Structured notes</small>
            </div>
          </div>

          <button
            type="button"
            className="mobileClose"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          className="newNoteButton"
          onClick={() => {
            onNewNote();
            onCloseMobile();
          }}
        >
          <Plus size={18} />

          <span>New note</span>
        </button>

        <div className="searchBox">
          <Search size={17} />

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notes..."
          />
        </div>

        <section className="sidebarSection">
          <div className="sectionHeader">
            <span>Folders</span>

            <button
              type="button"
              className="smallIconButton"
              onClick={onNewFolder}
              title="Create folder"
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="folderList">
            {data.folders.map((folder) => (
              <div className="folderItem" key={folder.id}>
                <FolderIcon size={16} />

                <span>{folder.name}</span>
              </div>
            ))}

            {data.folders.length === 0 && (
              <div className="sidebarEmpty">No folders yet</div>
            )}
          </div>
        </section>

        <section className="sidebarSection notesSection">
          <div className="sectionHeader">
            <span>Notes</span>

            <span className="noteCount">{notes.length}</span>
          </div>

          <div className="noteList">
            {notes.map((note) => (
              <button
                type="button"
                key={note.id}
                className={`noteItem ${
                  selectedId === note.id ? "selected" : ""
                }`}
                onClick={() => selectNote(note.id)}
              >
                <FileText size={17} />

                <div className="noteItemText">
                  <span>{note.title || "Untitled"}</span>

                  <small>
                    {note.pinned
                      ? "Pinned"
                      : new Date(note.updatedAt).toLocaleDateString()}
                  </small>
                </div>
              </button>
            ))}

            {notes.length === 0 && (
              <div className="sidebarEmpty">No notes found</div>
            )}
          </div>
        </section>

        <div className="sidebarFooter">
          <button type="button" className="themeButton" onClick={onToggleTheme}>
            {data.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}

            <span>{data.theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
