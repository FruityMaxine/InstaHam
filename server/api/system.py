"""系统级端点：关闭整个后端进程。

Windows 上 SIGINT 不会优雅传给 uvicorn 主循环，直接 os._exit 最稳；
延迟 0.3s 是为了让 HTTP 响应先返回给前端，不然客户端会拿到 connection reset。
"""

from __future__ import annotations

import os
import threading

from fastapi import APIRouter

router = APIRouter()


@router.post("/shutdown")
def shutdown() -> dict:
    threading.Timer(0.3, lambda: os._exit(0)).start()
    return {"ok": True, "message": "服务即将关闭"}
