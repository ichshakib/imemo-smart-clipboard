<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="../assets/images/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="../assets/images/logo-light.svg">
    <img src="../assets/images/logo.svg" width="64" height="64" alt="iMemo Logo">
  </picture>
</p>

<h1 align="center">iMemo Desktop Client</h1>

<p align="center">
  The core desktop companion for iMemo Smart Clipboard — built with Electron 30, React 18, TypeScript, and a pure Vanilla CSS design system.
</p>

---

## 🌟 Overview

The **iMemo Desktop Client** resides in `desktop/` and provides an air-gapped, ultra-responsive clipboard manager that lives in the system tray and summons with global hotkey `Alt + V`.

- **⚡ Instant Access HUD**: Frameless, always-on-top window positioned dynamically above the system taskbar.
- **🛡️ 100% Offline & Private**: Zero network beacons or cloud telemetry. Clipboard history is stored purely on-device via `electron-store`.
- **🪶 Zero-Bloat Vanilla CSS**: Pure CSS custom properties and micro-animations with zero Tailwind runtime overhead.
- **🔍 Sub-Millisecond Search**: Fast local keyword filtering across text snippets, URLs, and code blocks.
- **👁️ Dedicated Preview Inspector**: Inspect multi-line JSON, SQL queries, or image copies before pasting.

---

## 🏗️ Architecture

```text
desktop/
├── electron/
│   ├── main.ts              # Electron main process (lifecycle, tray, hotkeys, clipboard listener, IPC)
│   ├── preload.ts           # Context isolation bridge (safe IPC exposure)
│   └── electron-env.d.ts    # Ambient TypeScript declarations
├── src/
│   ├── components/
│   │   ├── HistoryView.tsx  # Infinite scroll list of captured items with action buttons
│   │   ├── StarredView.tsx  # Pinned favorites vault
│   │   ├── SearchView.tsx   # Live debounced full-text search view
│   │   ├── SettingsView.tsx # Hotkey recorder, instant paste toggle, startup launch settings
│   │   ├── Preview.tsx      # Multi-line snippet / image inspector window
│   │   └── Navbar.tsx       # Minimalist navigation bar with tab switching
│   ├── App.tsx              # Root container & system theme listener
│   ├── main.tsx             # React 18 DOM mount point
│   └── index.css            # Lightweight Vanilla CSS design system (Zinc palette)
├── public/
│   └── icons/               # Multi-resolution icons for Windows (.ico), macOS (.icns), and Linux (.png)
├── electron-builder.json5   # Distribution config for Windows (NSIS), macOS (DMG), and Linux (AppImage)
├── package.json             # Desktop scripts and dependencies
└── tsconfig.json            # Strict TypeScript configuration
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
| :--- | :--- |
| **Electron 30** | Native cross-platform desktop application framework |
| **React 18** | Declarative component UI rendering |
| **TypeScript 5** | Strict type safety across main, preload, and renderer layers |
| **Vite 5** | Lightning-fast HMR and bundling via `vite-plugin-electron` |
| **electron-store** | Encrypted local key-value persistence for clipboard items |
| **lucide-react** | Consistent, feather-light icons |
| **Vanilla CSS** | Custom design tokens, zero CSS framework overhead |

---

## 🚀 Development & Scripts

All commands must be executed within the `desktop/` directory:

```bash
cd desktop
pnpm install
```

| Script | Command | Description |
| :--- | :--- | :--- |
| **Development** | `pnpm dev` | Starts Vite dev server with Electron hot reload |
| **Typecheck** | `pnpm typecheck` | Validates TypeScript types across main & renderer (`tsc --noEmit`) |
| **Lint** | `pnpm lint` | Runs ESLint with zero-warning threshold |
| **Format** | `pnpm format` | Formats all code with Prettier |
| **Build (Local)** | `pnpm build` | Compiles bundles and builds native installer without publishing |
| **Release (CI)** | `pnpm release` | Compiles and publishes distribution binaries to GitHub Releases |

---

## 📡 IPC Channel Reference

The renderer process interacts with the main process via context-isolated IPC channels exposed through `window.ipcRenderer`:

### History & Store
- `history:get` (`invoke`) — Retrieves paginated clipboard history (`offset`, `limit`).
- `history:remove` (`invoke`) — Deletes an item from history by ID.
- `history:toggle-star` (`invoke`) — Toggles starred state for recurring snippets.
- `history:search` (`invoke`) — Performs full-text search across history.
- `history:updated` (`on`) — Broadcast event pushed when a new copy event is captured.

### Clipboard & Actions
- `clipboard:paste-item` (`send`) — Writes item to clipboard and triggers instant paste simulation into active app.
- `preview:show` (`send`) — Summons floating inspector window for content inspection.
- `preview:hide` (`send`) — Hides inspector window.
- `preview:resize` (`send`) — Dynamically adjusts preview window dimensions to content size.

### Settings & App
- `settings:get` (`invoke`) — Loads user preferences (`instantPaste`, `globalHotkey`, `startOnStartup`, `theme`).
- `settings:update` (`invoke`) — Saves modified settings and re-registers global hotkeys.
- `hide-window` (`send`) — Dismisses the clipboard HUD window.
- `app:version` (`invoke`) — Returns current application semver.

---

## 📦 Building Native Installers

Run `pnpm build` to compile production binaries for your current platform in `desktop/release/0.1.0/`:

- **Windows**: `iMemo-Smart-Clipboard-Windows-0.1.0-Setup.exe` (NSIS installer)
- **macOS**: `iMemo-Smart-Clipboard-Mac-0.1.0.dmg` (Universal binary)
- **Linux**: `iMemo-Smart-Clipboard-Linux-0.1.0.AppImage`, `.deb`, `.rpm`
