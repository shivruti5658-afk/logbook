import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { useAppData } from "./hooks/useAppData";
import { uid } from "./lib/id";
import type { Note } from "./types";

export default function App() {
  const {data,setData,saveState}=useAppData();
  const [selectedId,setSelectedId]=useState<string|null>(data.notes[0]?.id ?? null);
  const [query,setQuery]=useState("");

  const selected=data.notes.find(n=>n.id===selectedId);

  function newNote() {
    const now=new Date().toISOString();
    const note: Note={
      id:uid(), folderId:null, title:"Untitled",
      nodes:[{id:uid(),parentId:null,content:"",type:"bullet",position:0,collapsed:false}],
      createdAt:now,updatedAt:now,pinned:false,archived:false
    };
    setData(d=>({...d,notes:[note,...d.notes]}));
    setSelectedId(note.id);
  }

  function newFolder() {
    const name=window.prompt("Folder name");
    if(!name?.trim()) return;
    setData(d=>({...d,folders:[...d.folders,{id:uid(),parentId:null,name:name.trim()}]}));
  }

  function updateNote(note: Note) {
    setData(d=>({...d,notes:d.notes.map(n=>n.id===note.id?note:n)}));
  }

  function deleteNote() {
    if(!selected || !window.confirm(`Delete "${selected.title}"?`)) return;
    const rest=data.notes.filter(n=>n.id!==selected.id);
    setData(d=>({...d,notes:rest}));
    setSelectedId(rest[0]?.id??null);
  }

  return <div className="appShell">
    <Sidebar data={data} selectedId={selectedId} onSelect={setSelectedId}
      onNewNote={newNote} onNewFolder={newFolder} query={query} setQuery={setQuery}
      onToggleTheme={()=>setData(d=>({...d,theme:d.theme==="dark"?"light":"dark"}))}/>
    {selected
      ? <Editor note={selected} saveState={saveState} onUpdate={updateNote} onDelete={deleteNote}/>
      : <main className="welcome"><div><h1>Structured notes, without friction.</h1><p>Create a note and build ideas as a keyboard-controlled tree.</p><button className="primary" onClick={newNote}>Create your first note</button></div></main>}
  </div>
}
