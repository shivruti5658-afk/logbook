import type { NodeItem } from "../types";

export function childrenOf(
  nodes: NodeItem[],
  parentId: string | null,
): NodeItem[] {
  return nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.position - b.position);
}

export function descendants(nodes: NodeItem[], id: string): string[] {
  const result: string[] = [];

  function walk(parentId: string) {
    const children = childrenOf(nodes, parentId);

    children.forEach((child) => {
      result.push(child.id);
      walk(child.id);
    });
  }

  walk(id);

  return result;
}

export function visibleNodes(nodes: NodeItem[]): Array<{
  node: NodeItem;
  depth: number;
}> {
  const result: Array<{
    node: NodeItem;
    depth: number;
  }> = [];

  function walk(parentId: string | null, depth: number) {
    const children = childrenOf(nodes, parentId);

    children.forEach((node) => {
      result.push({
        node,
        depth,
      });

      if (!node.collapsed) {
        walk(node.id, depth + 1);
      }
    });
  }

  walk(null, 0);

  return result;
}

export function normalise(nodes: NodeItem[]): NodeItem[] {
  let result = [...nodes];

  const parentIds = new Set(nodes.map((node) => node.parentId));

  parentIds.forEach((parentId) => {
    const siblings = childrenOf(result, parentId);

    siblings.forEach((node, index) => {
      result = result.map((item) =>
        item.id === node.id
          ? {
              ...item,
              position: index,
            }
          : item,
      );
    });
  });

  return result;
}
