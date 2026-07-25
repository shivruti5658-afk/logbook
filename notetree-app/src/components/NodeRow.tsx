import { ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import type { NodeItem } from "../types";

type Props = {
  node: NodeItem;
  depth: number;
  hasChildren: boolean;
  index: number;
  inputRef: (el: HTMLInputElement | null) => void;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onToggle: () => void;
  onCheck: () => void;
};

export function NodeRow({node, depth, hasChildren, inputRef, onChange, onKeyDown, onToggle, onCheck}: Props) {
  const prefix =
    node.type === "number" ? "1." :
    node.type === "quote" ? "❝" :
    node.type === "code" ? "{}" : "•";

  return <div className={`nodeRow type-${node.type}`} style={{paddingLeft: `${depth*26}px`}}>
    <span className="drag"><GripVertical size={15}/></span>
    {hasChildren
      ? <button className="collapse" onClick={onToggle}>{node.collapsed?<ChevronRight size={16}/>:<ChevronDown size={16}/>}</button>
      : <span className="collapse spacer"/>}
    {node.type==="task"
      ? <input className="check" type="checkbox" checked={!!node.checked} onChange={onCheck}/>
      : <span className="bullet">{prefix}</span>}
    <input
      ref={inputRef}
      className="nodeInput"
      value={node.content}
      onChange={e=>onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={node.type==="heading" ? "Heading" : "Type something..."}
    />
  </div>
}
