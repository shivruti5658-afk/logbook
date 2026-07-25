# NoteTree

Keyboard-first hierarchical notes MVP built with React + TypeScript + Vite.

## Run

```bash
npm install
npm run dev
```

Open the local URL shown by Vite.

## Included

- Create/delete/rename notes
- Hierarchical block tree
- Enter: create sibling
- Tab / Shift+Tab: indent/outdent
- Arrow Up/Down: navigate
- Alt+Arrow Up/Down: reorder siblings
- Alt+Arrow Left/Right: outdent/indent
- Empty block + Backspace: delete subtree
- Collapse/expand branches
- Bullet, numbered, task, heading, quote and code block types
- Search across titles and block content
- Folder creation
- Pin/archive data flags
- Autosave to localStorage
- Light/dark mode
- Responsive layout

## Architecture

This package is intentionally a runnable frontend MVP. Persistence is localStorage so it starts without accounts, database credentials, or external services.

For production, replace `src/lib/storage.ts` with an API backed by PostgreSQL and add authentication. Keep the `Note` / `NodeItem` model as the client contract.

## Next production modules

1. Authentication and workspaces
2. PostgreSQL + migrations
3. Folder assignment and nested folders
4. Drag-and-drop tree movement
5. Rich text marks and links
6. Slash command menu
7. KaTeX equations
8. Version history
9. Import/export
10. Backlinks/tags
11. Collaborative editing
12. AI branch actions
