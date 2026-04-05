---
name: Production React & Electron Development
description: Guidelines for secure IPC boundaries, rigorous React implementations, and bundling in an Electron + Vite architecture.
---

# Production React & Electron Guidelines

To write high-quality, secure code for this project, you must adhere to the following architecture rules.

## 1. Security-First Electron Configuration
Electron applications face unique security threats if renderer processes gain access to Node.js environments.
- **NEVER** disable `contextIsolation`.
- **NEVER** enable `nodeIntegration` in the renderer.
- **ALWAYS** ensure `sandbox: true` is maintained on WebPreferences.

## 2. The IPC "Bridge" Pattern
Communication between the Renderer (React) and the Main (Node.js) process must occur through a strictly typed and controlled Bridge.
- **FORBIDDEN**: Never expose the raw `ipcRenderer` or `ipcRenderer.send` methods on the `contextBridge`.
- **REQUIRED**: Define explicit handlers in `preload.ts` for exactly what the UI needs, and nothing more.
- **PREFERENCE**: Use `ipcRenderer.invoke` and `ipcMain.handle` for a clean promise-based request-response flow over `send`/`on`.
- **VALIDATION**: Always validate and sanitize payloads coming from the renderer inside the main process handlers before executing Node logic.

## 3. React Development Standards
- Utilize Function Components with Hooks.
- Extensively use `<Context.Provider>` for global domain states but prefer granular context splitting over monolithic stores.
- Adhere to the ESLint Rules of Hooks (`react-hooks/exhaustive-deps`). It is a production best practice to never suppress these warnings, as doing so leads to stale closures and infinite loops.
- Adhere strictly to the project's standard library packages (`better-sqlite3`, `react-router-dom`).

## 4. Vite Specifics
- Use standard Vite path aliasing (or relative paths consistent with the project) when importing components.
- Do not bypass Vite’s asset management system by writing raw `<script src="...">` tags connecting to `__dirname` logic. Use standard ES Module imports logic in the frontend code.
