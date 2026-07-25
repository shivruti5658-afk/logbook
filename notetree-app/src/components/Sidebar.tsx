import { FileText, Folder as FolderIcon, Moon, Plus, Search, Sun } from "lucide-react";
import type { AppData } from "../types";

type Props = {
  data: AppData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewNote: () => void;
  onNewFolder: () => void;
  onToggleTheme: () => void;
  query: string;
  setQuery: (q: string) => void;
};

export function Sidebar({data, selectedId, onSelect, onNewNote, onNewFolder, onToggleTheme, query, setQuery}: Props) {
  const notes = data.notes
    .filter(n => !n.archived)
    .filter(n => `${n.title} ${n.nodes.map(x=>x.content).join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return <aside className="sidebar">
    <div className="brand">NoteTree</div>
    <button className="primary" onClick={onNewNote}><Plus size={17}/> New note</button>
    <div className="search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search notes"/></div>
    <div className="sectionRow"><span>Folders</span><button className="iconBtn" onClick={onNewFolder} title="New folder"><Plus size={15}/></button></div>
    <div className="folderList">
      {data.folders.map(f => <div className="folder" key={f.id}><FolderIcon size={15}/><span>{f.name}</span></div>)}
    </div>
    <div className="sectionRow"><span>Notes</span></div>
    <div className="noteList">
      {notes.map(n => <button key={n.id} className={`noteLink ${selectedId===n.id?"active":""}`} onClick={()=>onSelect(n.id)}>
        <FileText size={15}/><span>{n.title || "Untitled"}</span>
      </button>)}
      {!notes.length && <div className="emptySmall">No notes found</div>}
    </div>
    <div className="sidebarBottom">
      <button className="noteLink" onClick={onToggleTheme}>
        {data.theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}
        <span>{data.theme==="dark"?"Light mode":"Dark mode"}</span>
      </button>
    </div>
  </aside>
}
