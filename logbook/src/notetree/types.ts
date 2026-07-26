export type BlockType =
  | "bullet"
  | "number"
  | "task"
  | "heading"
  | "quote"
  | "code";

export interface NodeItem {
  id: string;
  parentId: string | null;
  content: string;
  type: BlockType;
  position: number;
  collapsed: boolean;
  checked?: boolean;
}

export interface Note {
  id: string;
  folderId: string | null;
  title: string;
  nodes: NodeItem[];
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
  archived: boolean;
}

export interface Folder {
  id: string;
  parentId: string | null;
  name: string;
}

export interface AppData {
  notes: Note[];
  folders: Folder[];
  theme: "light" | "dark";
}
