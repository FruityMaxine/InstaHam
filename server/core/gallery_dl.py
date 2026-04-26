"""gallery-dl 子进程封装。

关键约束：
1) 必须用 subprocess.Popen + 实时读 stdout/stderr，不能用 run/communicate（阻塞）。
2) stdout/stderr 各开一个线程喂 Queue，主迭代器统一消费，避免缓冲死锁。
3) 行级解析委托 output_parser，本文件只管进程生命周期与事件流。

提供：
- GalleryDLRunner：构造参数 + iter_run 流式产出 Event
- build_user_url：把用户名转为 Instagram 主页 URL
"""

from __future__ import annotations

import subprocess
import threading
from dataclasses import dataclass, asdict
from pathlib import Path
from queue import Empty, Queue
from typing import Iterator, Optional

from .output_parser import parse_line


@dataclass
class Event:
    type: str  # log|file|skip|error|warning|done|started
    text: str = ""
    file_path: Optional[str] = None
    user: Optional[str] = None
    code: Optional[int] = None  # 仅 done 用

    def to_dict(self) -> dict:
        return {k: v for k, v in asdict(self).items() if v is not None or k in ("type", "text")}


def _pump(stream, q: "Queue[tuple[str, Optional[str]]]", tag: str) -> None:
    """把单个流逐行塞进 queue，结束时塞 None 作为哨兵。"""
    try:
        for line in stream:
            q.put((tag, line))
    finally:
        q.put((tag, None))
        try:
            stream.close()
        except Exception:
            pass


class GalleryDLRunner:
    def __init__(self, bin_path: Path, ffmpeg_location: Optional[str] = None) -> None:
        self.bin_path = Path(bin_path)
        self.ffmpeg_location = ffmpeg_location
        if not self.bin_path.exists():
            raise FileNotFoundError(f"gallery-dl 不存在: {bin_path}")

    # ------------------ 命令构造 ------------------

    def build_args(
        self,
        urls: list[str],
        cookies_path: Path,
        archive_path: Path,
        download_dir: Path,
        include: list[str],
        videos_mode: str = "true",
    ) -> list[str]:
        args: list[str] = [str(self.bin_path)]
        args += ["-d", str(download_dir)]
        args += ["--cookies", str(cookies_path)]
        args += ["--download-archive", str(archive_path)]
        if include:
            args += ["-o", f"extractor.instagram.include={','.join(include)}"]
        # videos_mode: "true" / "merged" / "false"
        args += ["-o", f"extractor.instagram.videos={videos_mode}"]
        if self.ffmpeg_location:
            args += ["-o", f"ffmpeg-location={self.ffmpeg_location}"]
        # 输出尽量原样（不要 quiet，否则没日志）
        args += urls
        return args

    # ------------------ 流式执行 ------------------

    def iter_run(
        self,
        urls: list[str],
        cookies_path: Path,
        archive_path: Path,
        download_dir: Path,
        include: list[str],
        videos_mode: str = "true",
        user_label: Optional[str] = None,
    ) -> Iterator[Event]:
        args = self.build_args(urls, cookies_path, archive_path, download_dir, include, videos_mode)
        yield Event(type="started", text=" ".join(args), user=user_label)

        proc = subprocess.Popen(
            args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
        )
        q: "Queue[tuple[str, Optional[str]]]" = Queue()
        threading.Thread(target=_pump, args=(proc.stdout, q, "out"), daemon=True).start()
        threading.Thread(target=_pump, args=(proc.stderr, q, "err"), daemon=True).start()

        yield from self._consume_queue(q, proc, user_label)

        code = proc.wait()
        yield Event(type="done", text=f"exit {code}", code=code, user=user_label)

    def _consume_queue(
        self,
        q: "Queue[tuple[str, Optional[str]]]",
        proc: subprocess.Popen,
        user_label: Optional[str],
    ) -> Iterator[Event]:
        finished = 0
        while finished < 2:
            try:
                _tag, line = q.get(timeout=0.3)
            except Empty:
                if proc.poll() is not None and q.empty():
                    break
                continue
            if line is None:
                finished += 1
                continue
            parsed = parse_line(line)
            yield Event(
                type=parsed["type"],
                text=parsed["text"],
                file_path=parsed.get("file_path"),
                user=user_label,
            )


def build_user_url(username: str) -> str:
    """用户名 -> 主页 URL。include 配置决定拉哪些子类。"""
    username = username.strip().lstrip("@")
    return f"https://www.instagram.com/{username}/"
