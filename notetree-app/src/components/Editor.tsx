import { useMemo, useRef } from "react";
import { Archive, List, ListChecks, Pin, Quote, Trash2, Type, Code2 } from "lucide-react";
import type { BlockType, Note, NodeItem } from "../types";
import { childrenOf, descendants, normalise, visibleNodes } from "../lib/tree";
import { uid } from "../lib/id";
import { NodeRow } from "./NodeRow";

type Props = {
  note: Note;
  saveState: string;
  onUpdate: (note: Note) => void;
  onDelete: () => void;
};

export function Editor({note, saveState, onUpdate, onDelete}: Props) {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const visible = useMemo(() => visibleNodes(note.nodes), [note.nodes]);

  const updateNodes = (nodes: NodeItem[]) => onUpdate({...note, nodes: normalise(nodes), updatedAt: new Date().toISOString()});
  const focus = (id: string) => requestAnimationFrame(() => refs.current[id]?.focus());

  function patch(id: string, changes: Partial<NodeItem>) {
    updateNodes(note.nodes.map(n => n.id===id ? {...n, ...changes} : n));
  }

  function addAfter(node: NodeItem) {
    const siblings = childrenOf(note.nodes, node.parentId);
    const idx = siblings.findIndex(n=>n.id===node.id);
    const id = uid();
    const created: NodeItem = {id, parentId: node.parentId, content:"", type:"bullet", position:idx+1, collapsed:false};
    const shifted = note.nodes.map(n => n.parentId===node.parentId && n.position>node.position ? {...n, position:n.position+1} : n);
    updateNodes([...shifted, created]);
    focus(id);
  }

  function indent(node: NodeItem) {
    const siblings = childrenOf(note.nodes, node.parentId);
    const idx = siblings.findIndex(n=>n.id===node.id);
    if (idx<=0) return;
    const parent = siblings[idx-1];
    patch(node.id, {parentId:parent.id, position:childrenOf(note.nodes,parent.id).length});
    focus(node.id);
  }

  function outdent(node: NodeItem) {
    if (!node.parentId) return;
    const parent = note.nodes.find(n=>n.id===node.parentId);
    if (!parent) return;
    const newPos = parent.position + 1;
    const shifted = note.nodes.map(n => n.parentId===parent.parentId && n.position>=newPos ? {...n, position:n.position+1} : n);
    updateNodes(shifted.map(n => n.id===node.id ? {...n,parentId:parent.parentId,position:newPos} : n));
    focus(node.id);
  }

  function move(node: NodeItem, delta: number) {
    const siblings = childrenOf(note.nodes,node.parentId);
    const i = siblings.findIndex(n=>n.id===node.id);
    const j = i+delta;
    if (j<0 || j>=siblings.length) return;
    const other = siblings[j];
    updateNodes(note.nodes.map(n =>
      n.id===node.id ? {...n,position:other.position} :
      n.id===other.id ? {...n,position:node.position} : n
    ));
    focus(node.id);
  }

  function remove(node: NodeItem) {
    const ids = new Set([node.id,...descendants(note.nodes,node.id)]);
    const next = visible.findIndex(x=>x.node.id===node.id);
    const target = visible[next-1]?.node.id || visible[next+1]?.node.id;
    updateNodes(note.nodes.filter(n=>!ids.has(n.id)));
    if(target) focus(target);
  }

  function setType(node: NodeItem, type: BlockType) {
    patch(node.id,{type});
    focus(node.id);
  }

  function onKey(node: NodeItem, e: React.KeyboardEvent<HTMLInputElement>) {
    if(e.key==="Enter") { e.preventDefault(); addAfter(node); return; }
    if(e.key==="Tab") { e.preventDefault(); e.shiftKey ? outdent(node) : indent(node); return; }
    if(e.altKey && e.key==="ArrowUp") { e.preventDefault(); move(node,-1); return; }
    if(e.altKey && e.key==="ArrowDown") { e.preventDefault(); move(node,1); return; }
    if(e.altKey && e.key==="ArrowRight") { e.preventDefault(); indent(node); return; }
    if(e.altKey && e.key==="ArrowLeft") { e.preventDefault(); outdent(node); return; }
    if(e.key==="ArrowUp") {
      const i=visible.findIndex(x=>x.node.id===node.id); const id=visible[i-1]?.node.id;
      if(id){e.preventDefault();focus(id)}
    }
    if(e.key==="ArrowDown") {
      const i=visible.findIndex(x=>x.node.id===node.id); const id=visible[i+1]?.node.id;
      if(id){e.preventDefault();focus(id)}
    }
    if(e.key==="Backspace" && !node.content) { e.preventDefault(); remove(node); }
  }

  const active = document.activeElement instanceof HTMLInputElement
    ? note.nodes.find(n=>refs.current[n.id]===document.activeElement)
    : undefined;

  return <main className="editor">
    <div className="editorTop">
      <span className="saveState">{saveState}</span>
      <div className="actions">
        <button className="iconBtn" title="Pin" onClick={()=>onUpdate({...note,pinned:!note.pinned})}><Pin size={17}/></button>
        <button className="iconBtn" title="Archive" onClick={()=>onUpdate({...note,archived:true})}><Archive size={17}/></button>
        <button className="iconBtn danger" title="Delete" onClick={onDelete}><Trash2 size={17}/></button>
      </div>
    </div>
    <input className="titleInput" value={note.title} onChange={e=>onUpdate({...note,title:e.target.value,updatedAt:new Date().toISOString()})} placeholder="Untitled"/>
    <div className="formatBar">
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"bullet")}><List size={15}/> Bullet</button>
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"number")}>1. Number</button>
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"task")}><ListChecks size={15}/> Task</button>
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"heading")}><Type size={15}/> Heading</button>
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"quote")}><Quote size={15}/> Quote</button>
      <button onMouseDown={e=>e.preventDefault()} onClick={()=>active&&setType(active,"code")}><Code2 size={15}/> Code</button>
    </div>
    <div className="nodes">
      {visible.map(({node,depth},index) => <NodeRow
        key={node.id} node={node} depth={depth} index={index}
        hasChildren={childrenOf(note.nodes,node.id).length>0}
        inputRef={el=>{refs.current[node.id]=el}}
        onChange={content=>patch(node.id,{content})}
        onKeyDown={e=>onKey(node,e)}
        onToggle={()=>patch(node.id,{collapsed:!node.collapsed})}
        onCheck={()=>patch(node.id,{checked:!node.checked})}
      />)}
    </div>
    <div className="shortcutHelp">Enter sibling · Tab child · Shift+Tab outdent · ↑/↓ navigate · Alt+↑/↓ reorder · Backspace empty node</div>
  </main>
}
