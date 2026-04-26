# bin/

This directory ships [`gallery-dl.exe`](https://codeberg.org/mikf/gallery-dl) so the project works out of the box on Windows. **No extra download needed.**

| File | Source | License |
|---|---|---|
| `gallery-dl.exe` | [Codeberg release](https://codeberg.org/mikf/gallery-dl/releases) | GPL-2.0 © Mike Fährmann et al. |

The binary is invoked as an external subprocess by `server/core/gallery_dl.py`. InstaHam does **not** statically link or embed gallery-dl source code.

## Upgrading

Download a newer `gallery-dl.exe` from the [Codeberg releases page](https://codeberg.org/mikf/gallery-dl/releases) and replace this file. Or run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/setup.ps1 -Force
```
