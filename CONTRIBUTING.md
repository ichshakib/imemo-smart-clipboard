# Contributing to iMemo Smart Clipboard

First off, thank you for considering contributing to **iMemo Smart Clipboard**! It is contributions from developers and power users like you that make iMemo a fast, reliable, and privacy-focused tool.

---

## 🛠️ How to Contribute

### 1. Fork the Repository
Click the **Fork** button at the top right of the [repository page](https://github.com/ichshakib/imemo-smart-clipboard) to create your own copy on GitHub.

### 2. Clone Your Fork
Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/imemo-smart-clipboard.git
cd imemo-smart-clipboard
```

### 3. Configure Upstream Remote
Add the original repository as an upstream remote to stay synced with the latest changes:

```bash
git remote add upstream https://github.com/ichshakib/imemo-smart-clipboard.git
```

### 4. Install Dependencies
iMemo uses `pnpm` for package management. Install dependencies inside the `desktop` workspace:

```bash
cd desktop
pnpm install
```

### 5. Create a Feature Branch
Before making any changes, create a descriptive branch:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix-name
```

### 6. Local Development
Run the development environment:

```bash
cd desktop
pnpm dev
```

To test the web landing page, open `index.html` in your browser or run:
```bash
python -m http.server 8080
```

### 7. Code Quality & Typechecks
Before committing, verify that your changes pass linting and type checks without errors:

```bash
cd desktop
pnpm run lint
pnpm run typecheck
```

### 8. Commit Conventions
Write clear, conventional commit messages:

```bash
git add .
git commit -m "feat(desktop): add new feature description"
```

Common prefixes:
- `feat:` New features
- `fix:` Bug fixes
- `style:` CSS and visual improvements
- `refactor:` Code restructuring with no behavior change
- `docs:` Documentation updates
- `chore:` Tooling and maintenance

### 9. Push and Open a Pull Request
Push your branch to your fork:

```bash
git push origin feature/your-feature-name
```

Navigate to [https://github.com/ichshakib/imemo-smart-clipboard/pulls](https://github.com/ichshakib/imemo-smart-clipboard/pulls) and open a new Pull Request. Fill out the pull request template with context, screenshots (if applicable), and testing details.

---

## 📐 Development Guidelines

### Architecture Overview
- `desktop/`: The Electron application using React 18, Vite, and TypeScript.
  - **No TailwindCSS**: We use pure, lightweight **Vanilla CSS** (`src/index.css`) to maintain an ultra-fast, minimal memory footprint. Please avoid adding heavy CSS frameworks or utility generators.
  - `electron/main.ts`: Main process handling clipboard events, tray, global shortcuts, and window lifecycle.
  - `src/components/`: Reusable React view components (`HistoryView`, `StarredView`, `SearchView`, `SettingsView`, `Preview`, `Navbar`).
- `assets/` & `index.html`: Standalone web landing page and multi-platform download hub.

### Reporting Issues
If you encounter a bug or have a feature suggestion, please check existing issues first or open a new one:
- [Open an Issue](https://github.com/ichshakib/imemo-smart-clipboard/issues)
- Provide system specifications (OS version, app version, reproduction steps).

---

## 📬 Contact & Maintainer Support

If you need guidance or have any questions regarding contributions, reach out to the project maintainer:

- **Maintainer**: Shakib Khan ([@ichshakib](https://github.com/ichshakib))
- **Email**: [ichshakib@gmail.com](mailto:ichshakib@gmail.com)
- **GitHub Discussions / Issues**: [https://github.com/ichshakib/imemo-smart-clipboard/issues](https://github.com/ichshakib/imemo-smart-clipboard/issues)

---

## 📜 Code of Conduct

Please note that this project participates under the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By contributing, you agree to uphold this code.
