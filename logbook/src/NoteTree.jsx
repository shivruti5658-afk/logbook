import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "notetree:data:v1";
const makeId = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

function loadData() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (saved?.notes && saved?.folders) return saved;
  } catch (error) {
    console.error(error);
  }
  return { notes: [], folders: [], theme: "dark" };
}

function visibleNodes(nodes) {
  const result = [];
  const walk = (parentId, depth) => {
    nodes
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.position - b.position)
      .forEach((node) => {
        result.push({ node, depth });
        if (!node.collapsed) walk(node.id, depth + 1);
      });
  };
  walk(null, 0);
  return result;
}

export default function NoteTree({ navigateTo }) {
  const [data, setData] = useState(loadData);
  const [selectedId, setSelectedId] = useState(() => loadData().notes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [saveState, setSaveState] = useState("Saved");
  const inputRefs = useRef({});
  const selected = data.notes.find((note) => note.id === selectedId);

  useEffect(() => {
    setSaveState("Saving...");
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveState("Saved");
    }, 300);
    return () => window.clearTimeout(timer);
  }, [data]);

  const notes = useMemo(
    () =>
      data.notes
        .filter((note) => !note.archived)
        .filter((note) => `${note.title} ${note.nodes.map((node) => node.content).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    [data.notes, query],
  );

  const updateNote = (nextNote) =>
    setData((current) => ({
      ...current,
      notes: current.notes.map((note) => (note.id === nextNote.id ? nextNote : note)),
    }));

  const newNote = () => {
    const now = new Date().toISOString();
    const note = {
      id: makeId(), title: "Untitled", folderId: null, createdAt: now, updatedAt: now, pinned: false, archived: false,
      nodes: [{ id: makeId(), parentId: null, content: "", type: "bullet", position: 0, collapsed: false }],
    };
    setData((current) => ({ ...current, notes: [note, ...current.notes] }));
    setSelectedId(note.id);
  };

  const newFolder = () => {
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    setData((current) => ({ ...current, folders: [...current.folders, { id: makeId(), name: name.trim() }] }));
  };

  const patchNode = (id, changes) => {
    if (!selected) return;
    updateNote({ ...selected, updatedAt: new Date().toISOString(), nodes: selected.nodes.map((node) => node.id === id ? { ...node, ...changes } : node) });
  };

  const addAfter = (node) => {
    if (!selected) return;
    const id = makeId();
    const nodes = selected.nodes.map((item) => item.parentId === node.parentId && item.position > node.position ? { ...item, position: item.position + 1 } : item);
    updateNote({ ...selected, updatedAt: new Date().toISOString(), nodes: [...nodes, { id, parentId: node.parentId, content: "", type: "bullet", position: node.position + 1, collapsed: false }] });
    requestAnimationFrame(() => inputRefs.current[id]?.focus());
  };

  const deleteNote = () => {
    if (!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    const remaining = data.notes.filter((note) => note.id !== selected.id);
    setData((current) => ({ ...current, notes: remaining }));
    setSelectedId(remaining[0]?.id ?? null);
  };

  const nodes = selected ? visibleNodes(selected.nodes) : [];
  return (
    <div className={`note-tree ${data.theme === "light" ? "note-tree--light" : ""}`}>
      <aside className="note-tree-sidebar">
        <div className="note-tree-brand"><button type="button" onClick={() => navigateTo?.("/")}>←</button> NoteTree</div>
        <button className="note-tree-primary" type="button" onClick={newNote}>＋ New note</button>
        <label className="note-tree-search">⌕ <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notes" /></label>
        <div className="note-tree-section"><span>Folders</span><button type="button" onClick={newFolder}>＋</button></div>
        <div className="note-tree-folders">{data.folders.map((folder) => <div key={folder.id}>□ {folder.name}</div>)}</div>
        <div className="note-tree-section"><span>Notes</span></div>
        <div className="note-tree-list">
          {notes.map((note) => <button key={note.id} className={note.id === selectedId ? "active" : ""} type="button" onClick={() => setSelectedId(note.id)}>▤ {note.title || "Untitled"}</button>)}
          {!notes.length && <small>No notes found</small>}
        </div>
        <button className="note-tree-theme" type="button" onClick={() => setData((current) => ({ ...current, theme: current.theme === "dark" ? "light" : "dark" }))}>{data.theme === "dark" ? "☀ Light mode" : "◐ Dark mode"}</button>
      </aside>

      {selected ? <main className="note-tree-editor">
        <div className="note-tree-editor-top"><span>{saveState}</span><div><button type="button" onClick={() => updateNote({ ...selected, pinned: !selected.pinned })}>⌖</button><button type="button" onClick={() => updateNote({ ...selected, archived: true })}>Archive</button><button type="button" onClick={deleteNote}>Delete</button></div></div>
        <input className="note-tree-title" value={selected.title} onChange={(event) => updateNote({ ...selected, title: event.target.value, updatedAt: new Date().toISOString() })} placeholder="Untitled" />
        <div className="note-tree-format"><span>Block type:</span>{["bullet", "number", "task", "heading", "quote", "code"].map((type) => <button key={type} type="button" onClick={() => { const focused = Object.entries(inputRefs.current).find(([, input]) => input === document.activeElement)?.[0]; if (focused) patchNode(focused, { type }); }}>{type}</button>)}</div>
        <div className="note-tree-nodes">{nodes.map(({ node, depth }) => <div key={node.id} className={`note-tree-row note-tree-${node.type}`} style={{ paddingLeft: `${depth * 26}px` }}>
          <button type="button" onClick={() => patchNode(node.id, { collapsed: !node.collapsed })}>{selected.nodes.some((item) => item.parentId === node.id) ? (node.collapsed ? "›" : "⌄") : "•"}</button>
          {node.type === "task" && <input type="checkbox" checked={Boolean(node.checked)} onChange={() => patchNode(node.id, { checked: !node.checked })} />}
          <input ref={(element) => { inputRefs.current[node.id] = element; }} value={node.content} onChange={(event) => patchNode(node.id, { content: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addAfter(node); } }} placeholder={node.type === "heading" ? "Heading" : "Type something..."} />
        </div>)}</div>
        <p className="note-tree-help">Enter creates a sibling block. Use the block-type controls to structure your note.</p>
      </main> : <main className="note-tree-welcome"><div><h1>Structured notes, without friction.</h1><p>Create a note and build ideas as a tree.</p><button className="note-tree-primary" type="button" onClick={newNote}>Create your first note</button></div></main>}
    </div>
  );
}
