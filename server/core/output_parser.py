"""gallery-dl stdout/stderr 行级解析。

gallery-dl 默认输出约定：
- 普通已下载文件：直接打印绝对路径（一行一个）
- 命中 archive 跳过：行首带 `# `
- 错误：`[<extractor>][error] <message>` 或 `[error] ...`
- 警告：`[<extractor>][warning] ...`
- 信息：`[<extractor>][info] ...`

我们只取这五类即可，其余归类为 log。
保持纯函数 + 零 IO，方便单测。
"""

from __future__ import annotations

import re
from typing import TypedDict


class ParsedLine(TypedDict, total=False):
    type: str  # log | file | skip | error | warning
    text: str
    file_path: str | None


_LEVEL_RE = re.compile(r"^\[[^\]]+\]\[(error|warning|info)\]\s+(.*)$", re.IGNORECASE)


def parse_line(raw: str) -> ParsedLine:
    """解析单行，返回 dict。"""
    line = raw.rstrip("\r\n")
    if not line.strip():
        return {"type": "log", "text": "", "file_path": None}

    m = _LEVEL_RE.match(line)
    if m:
        level = m.group(1).lower()
        if level == "error":
            return {"type": "error", "text": line, "file_path": None}
        if level == "warning":
            return {"type": "warning", "text": line, "file_path": None}
        return {"type": "log", "text": line, "file_path": None}

    if line.startswith("# "):
        # archive 命中或已存在
        return {"type": "skip", "text": line, "file_path": line[2:].strip()}

    # 路径判定：含路径分隔符且不以 [ 开头
    if (("\\" in line) or ("/" in line)) and not line.startswith("["):
        return {"type": "file", "text": line, "file_path": line.strip()}

    return {"type": "log", "text": line, "file_path": None}
