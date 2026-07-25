import type { NodeItem } from "../types";

export function childrenOf(nodes: NodeItem[], parentId: string | null) {
  return nodes.filter(n => n.parentId === parentId).sort((a,b) => a.position-b.position);
}

export function descendants(nodes: NodeItem[], id: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const child of childrenOf(nodes, pid)) {
      out.push(child.id);
      walk(child.id);
    }
  };
  walk(id);
  return out;
}

export function visibleNodes(nodes: NodeItem[]) {
  const out: Array<{node: NodeItem; depth: number}> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const node of childrenOf(nodes, parentId)) {
      out.push({ node, depth });
      if (!node.collapsed) walk(node.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export function normalise(nodes: NodeItem[]) {
  const parents = new Set<string | null>(nodes.map(n => n.parentId));
  let result = [...nodes];
  for (const pid of parents) {
    const siblings = childrenOf(result, pid);
    siblings.forEach((n, i) => {
      result = result.map(x => x.id === n.id ? {...x, position: i} : x);
    });
  }
  return result;
}
