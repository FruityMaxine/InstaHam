# Contributing to InstaHam

Thanks for being interested. This is a small project; the bar is correctness + taste, not paperwork.

## Quick development loop

```powershell
# Backend with auto-reload
py -m uvicorn server.main:app --reload --port 8765

# Frontend dev (hot reload, proxies /api and /ws to 8765)
cd web
npm run dev
```

Open http://localhost:5173 — Vite proxies API and WebSocket calls to the FastAPI on 8765.

## Before opening a PR

- **Lint / typecheck the frontend**: `cd web && npm run build` must pass cleanly (TS strict).
- **Don't commit secrets**: anything under `server/data/` except `*.example.*` and `.gitkeep` is gitignored — keep it that way.
- **Don't commit binaries**: `bin/gallery-dl.exe` is fetched by `scripts/setup.ps1`.
- **Bilingual README**: if you change `README.md` substantively, mirror the change in `README.zh-CN.md` (or note in the PR that it's a follow-up).

## Code style

### Python

- Type hints on public functions.
- Module docstrings explain *why* the module exists; let function names explain *what* they do.
- Long functions (>80 lines) → split.
- `subprocess.Popen` for any `gallery-dl` call — never `.run()` / `.communicate()`. Streaming is the entire point.

### TypeScript / React

- Functional components only.
- One Zustand store (`web/src/lib/store.ts`); avoid prop drilling.
- Tailwind utility classes; reuse the named primitives in `web/src/index.css` (`panel`, `btn-primary`, `btn-ghost`, `input`, `chip`, `label`) before inventing new ones.
- Single accent color (emerald‑400). Reds for errors, ambers for warnings. Don't introduce a third hue.
- Monospace for any data: usernames, paths, log lines, raw numbers.

### Commits

- Imperative mood: "fix progress bar sweep range" not "fixed" or "fixes".
- One concern per commit; rebase / squash before opening the PR if helpful.

## Reporting bugs

Open an issue with:
1. What you expected vs. what happened.
2. `server.log` tail (redact cookies if any leak in).
3. Browser console output (open DevTools).
4. gallery‑dl version (`./bin/gallery-dl.exe --version`) and InstaHam commit SHA.

## Areas that would benefit from contributions

- macOS / Linux launcher scripts (currently Windows‑only).
- Concurrent per‑user downloads (right now `concurrency` is a hint, not enforced — `core/gallery_dl.py` runs serially).
- Localization beyond zh‑CN / en.
- Pyinstaller single‑exe packaging.
- Tests for `output_parser.py` against captured gallery‑dl logs.
