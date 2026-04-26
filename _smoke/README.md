# Smoke tests (manual)

Playwright scripts used during development to verify the UI in a real Chromium against a running backend. Not part of CI — run them manually after big UI changes.

## Setup

```bash
py -m pip install playwright
py -m playwright install chromium
```

Make sure the backend is running on `http://127.0.0.1:8765` (`launcher.bat` or `py -m uvicorn server.main:app --port 8765`), and the frontend is built (`cd web && npm run build`).

## Scripts

| Script | What it checks |
|---|---|
| `smoke_ui.py`     | Boot, key controls present, settings drawer opens, ad‑hoc download starts |
| `smoke_skip.py`   | Re‑downloading a target produces skip lines via the existing archive |
| `smoke_final.py`  | Friendly `user_start` log line shows up |
| `smoke_fixes.py`  | Exit button + save banner + indeterminate bar sweeps full width + `/api/system/shutdown` actually kills the backend |

Outputs go to `_smoke/shots/` (gitignored). Inspect them visually after each run.

## Running

```bash
py _smoke/smoke_ui.py
py _smoke/smoke_fixes.py
```
