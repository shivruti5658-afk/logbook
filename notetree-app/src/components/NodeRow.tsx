import type { CSSProperties, KeyboardEvent } from "react";

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
} from "lucide-react";

import type { NodeItem } from "../types";

type Props = {
  node: NodeItem;
  depth: number;
  hasChildren: boolean;

  inputRef: (element: HTMLInputElement | null) => void;

  onChange: (value: string) => void;

  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;

  onToggle: () => void;
  onCheck: () => void;
  onIndent: () => void;
  onOutdent: () => void;
};

export function NodeRow({
  node,
  depth,
  hasChildren,
  inputRef,
  onChange,
  onKeyDown,
  onToggle,
  onCheck,
  onIndent,
  onOutdent,
}: Props) {
  const prefix =
    node.type === "number"
      ? "1."
      : node.type === "quote"
        ? "❝"
        : node.type === "code"
          ? "{}"
          : "•";

  const style = {
    "--node-depth": depth,
  } as CSSProperties;

  return (
    <div className={`nodeRow type-${node.type}`} style={style}>
      <div className="nodeControls">
        <span className="nodeAction dragHandle" title="Move block">
          <GripVertical size={16} />
        </span>

        <button
          type="button"
          className="nodeAction"
          disabled={depth === 0}
          title="Move left"
          aria-label="Move bullet left"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onOutdent}
        >
          <ChevronLeft size={17} />
        </button>

        <button
          type="button"
          className="nodeAction"
          title="Make sub-bullet"
          aria-label="Make sub-bullet"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onIndent}
        >
          <ChevronRight size={17} />
        </button>

        {hasChildren ? (
          <button
            type="button"
            className="nodeAction"
            title={node.collapsed ? "Expand" : "Collapse"}
            aria-label={
              node.collapsed ? "Expand children" : "Collapse children"
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={onToggle}
          >
            {node.collapsed ? (
              <ChevronRight size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </button>
        ) : (
          <span className="collapsePlaceholder" />
        )}
      </div>

      <div className="nodeContent">
        {node.type === "task" ? (
          <input
            type="checkbox"
            className="check"
            checked={!!node.checked}
            onChange={onCheck}
            aria-label="Toggle task"
          />
        ) : (
          <span className="bullet">{prefix}</span>
        )}

        <input
          ref={inputRef}
          className="nodeInput"
          value={node.content}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            node.type === "heading" ? "Heading" : "Type something..."
          }
        />
      </div>
    </div>
  );
}
