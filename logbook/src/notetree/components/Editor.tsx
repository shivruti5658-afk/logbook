import { useMemo, useRef } from "react";

import type { KeyboardEvent } from "react";

import {
  Archive,
  CheckSquare,
  Code2,
  List,
  ListOrdered,
  Pin,
  Quote,
  Trash2,
  Type,
} from "lucide-react";

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

export function Editor({ note, saveState, onUpdate, onDelete }: Props) {
  const refs = useRef<Record<string, HTMLInputElement | null>>({});

  const visible = useMemo(() => visibleNodes(note.nodes), [note.nodes]);

  function updateNodes(nodes: NodeItem[]) {
    onUpdate({
      ...note,

      nodes: normalise(nodes),

      updatedAt: new Date().toISOString(),
    });
  }

  function focus(id: string) {
    requestAnimationFrame(() => {
      refs.current[id]?.focus();
    });
  }

  function patch(id: string, changes: Partial<NodeItem>) {
    updateNodes(
      note.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              ...changes,
            }
          : node,
      ),
    );
  }

  function addAfter(node: NodeItem) {
    const siblings = childrenOf(note.nodes, node.parentId);

    const index = siblings.findIndex((item) => item.id === node.id);

    const id = uid();

    const created: NodeItem = {
      id,

      parentId: node.parentId,

      content: "",

      type: "bullet",

      position: index + 1,

      collapsed: false,
    };

    const shifted = note.nodes.map((item) =>
      item.parentId === node.parentId && item.position > node.position
        ? {
            ...item,

            position: item.position + 1,
          }
        : item,
    );

    updateNodes([...shifted, created]);

    focus(id);
  }

  function addChild(node: NodeItem) {
    const id = uid();

    const children = childrenOf(note.nodes, node.id);

    const created: NodeItem = {
      id,

      parentId: node.id,

      content: "",

      type: "bullet",

      position: children.length,

      collapsed: false,
    };

    const updated = note.nodes.map((item) =>
      item.id === node.id
        ? {
            ...item,
            collapsed: false,
          }
        : item,
    );

    updateNodes([...updated, created]);

    focus(id);
  }

  function indent(node: NodeItem) {
    const siblings = childrenOf(note.nodes, node.parentId);

    const index = siblings.findIndex((item) => item.id === node.id);

    if (index <= 0) {
      return;
    }

    const newParent = siblings[index - 1];

    const children = childrenOf(note.nodes, newParent.id);

    const updated = note.nodes.map((item) => {
      if (item.id === newParent.id) {
        return {
          ...item,
          collapsed: false,
        };
      }

      if (item.id === node.id) {
        return {
          ...item,

          parentId: newParent.id,

          position: children.length,
        };
      }

      return item;
    });

    updateNodes(updated);

    focus(node.id);
  }

  function outdent(node: NodeItem) {
    if (!node.parentId) {
      return;
    }

    const parent = note.nodes.find((item) => item.id === node.parentId);

    if (!parent) {
      return;
    }

    const newPosition = parent.position + 1;

    const shifted = note.nodes.map((item) => {
      if (item.parentId === parent.parentId && item.position >= newPosition) {
        return {
          ...item,

          position: item.position + 1,
        };
      }

      return item;
    });

    const updated = shifted.map((item) =>
      item.id === node.id
        ? {
            ...item,

            parentId: parent.parentId,

            position: newPosition,
          }
        : item,
    );

    updateNodes(updated);

    focus(node.id);
  }

  function move(node: NodeItem, delta: number) {
    const siblings = childrenOf(note.nodes, node.parentId);

    const currentIndex = siblings.findIndex((item) => item.id === node.id);

    const targetIndex = currentIndex + delta;

    if (targetIndex < 0 || targetIndex >= siblings.length) {
      return;
    }

    const other = siblings[targetIndex];

    updateNodes(
      note.nodes.map((item) => {
        if (item.id === node.id) {
          return {
            ...item,

            position: other.position,
          };
        }

        if (item.id === other.id) {
          return {
            ...item,

            position: node.position,
          };
        }

        return item;
      }),
    );

    focus(node.id);
  }

  function remove(node: NodeItem) {
    const ids = new Set([node.id, ...descendants(note.nodes, node.id)]);

    const remainingNodes = note.nodes.filter((item) => !ids.has(item.id));

    // Never leave the editor without an input node.
    if (remainingNodes.length === 0) {
      setTimeout(() => {
        focus(node.id);
      }, 0);

      return;
    }

    const index = visible.findIndex((item) => item.node.id === node.id);

    const target = visible[index - 1]?.node.id ?? visible[index + 1]?.node.id;

    updateNodes(remainingNodes);

    if (target) {
      setTimeout(() => {
        focus(target);
      }, 0);
    }
  }

  function setType(node: NodeItem, type: BlockType) {
    patch(node.id, { type });

    focus(node.id);
  }

  function onKey(node: NodeItem, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();

      addChild(node);

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      addAfter(node);

      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      if (event.shiftKey) {
        outdent(node);
      } else {
        indent(node);
      }

      return;
    }

    if (event.altKey && event.key === "ArrowUp") {
      event.preventDefault();

      move(node, -1);

      return;
    }

    if (event.altKey && event.key === "ArrowDown") {
      event.preventDefault();

      move(node, 1);

      return;
    }

    if (event.altKey && event.key === "ArrowRight") {
      event.preventDefault();

      indent(node);

      return;
    }

    if (event.altKey && event.key === "ArrowLeft") {
      event.preventDefault();

      outdent(node);

      return;
    }

    if (event.key === "ArrowUp") {
      const index = visible.findIndex((item) => item.node.id === node.id);

      const id = visible[index - 1]?.node.id;

      if (id) {
        event.preventDefault();

        focus(id);
      }
    }

    if (event.key === "ArrowDown") {
      const index = visible.findIndex((item) => item.node.id === node.id);

      const id = visible[index + 1]?.node.id;

      if (id) {
        event.preventDefault();

        focus(id);
      }
    }

    if (event.key === "Backspace" && !node.content) {
      event.preventDefault();

      // 1. Last node — keep it.
      if (note.nodes.length === 1) {
        focus(node.id);
        return;
      }

      // 2. Nested empty node — move it left first.
      if (node.parentId !== null) {
        outdent(node);
        return;
      }

      // 3. Empty root node — remove it.
      remove(node);
      return;
    }
  }

  const active =
    document.activeElement instanceof HTMLInputElement
      ? note.nodes.find(
          (node) => refs.current[node.id] === document.activeElement,
        )
      : undefined;

  return (
    <main className="editor">
      <header className="editorHeader">
        <div className="saveArea">
          <span className={`saveDot ${saveState === "Saved" ? "saved" : ""}`} />

          <span>{saveState}</span>
        </div>

        <div className="editorActions">
          <button
            type="button"
            className={`iconButton ${note.pinned ? "activeButton" : ""}`}
            title="Pin note"
            onClick={() =>
              onUpdate({
                ...note,
                pinned: !note.pinned,
              })
            }
          >
            <Pin size={18} />
          </button>

          <button
            type="button"
            className="iconButton"
            title="Archive note"
            onClick={() =>
              onUpdate({
                ...note,
                archived: true,
              })
            }
          >
            <Archive size={18} />
          </button>

          <button
            type="button"
            className="iconButton dangerButton"
            title="Delete note"
            onClick={onDelete}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </header>

      <article className="document">
        <input
          className="titleInput"
          value={note.title}
          onChange={(event) =>
            onUpdate({
              ...note,

              title: event.target.value,

              updatedAt: new Date().toISOString(),
            })
          }
          placeholder="Untitled"
        />

        <div className="formatBar">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "bullet")}
          >
            <List size={16} />
            <span>Bullet</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "number")}
          >
            <ListOrdered size={16} />
            <span>Number</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "task")}
          >
            <CheckSquare size={16} />
            <span>Task</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "heading")}
          >
            <Type size={16} />
            <span>Heading</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "quote")}
          >
            <Quote size={16} />
            <span>Quote</span>
          </button>

          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => active && setType(active, "code")}
          >
            <Code2 size={16} />
            <span>Code</span>
          </button>
        </div>

        <section className="nodes">
          {visible.map(({ node, depth }) => (
            <NodeRow
              key={node.id}
              node={node}
              depth={depth}
              hasChildren={childrenOf(note.nodes, node.id).length > 0}
              inputRef={(element) => {
                refs.current[node.id] = element;
              }}
              onChange={(content) =>
                patch(node.id, {
                  content,
                })
              }
              onKeyDown={(event) => onKey(node, event)}
              onToggle={() =>
                patch(node.id, {
                  collapsed: !node.collapsed,
                })
              }
              onCheck={() =>
                patch(node.id, {
                  checked: !node.checked,
                })
              }
              onIndent={() => indent(node)}
              onOutdent={() => outdent(node)}
            />
          ))}
        </section>

        <div className="keyboardHelp">
          <span>
            <kbd>Enter</kbd>
            New bullet
          </span>

          <span>
            <kbd>Tab</kbd>
            Sub-bullet
          </span>

          <span>
            <kbd>Shift</kbd>+<kbd>Tab</kbd>
            Move left
          </span>

          <span>
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd>
            Child
          </span>

          <span>
            <kbd>Alt</kbd>+<kbd>↑</kbd>
            <kbd>↓</kbd>
            Reorder
          </span>
        </div>
      </article>
    </main>
  );
}
