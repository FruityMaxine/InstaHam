"""archive.sqlite 统计。"""

from __future__ import annotations

from fastapi import APIRouter

from server.core.archive import stats as archive_stats
from .storage import ARCHIVE_FILE

router = APIRouter()


@router.get("/stats")
def stats() -> dict:
    return archive_stats(ARCHIVE_FILE)
