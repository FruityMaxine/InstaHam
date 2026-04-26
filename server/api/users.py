"""用户与分组 CRUD。

users.json 结构：
{
  "groups": ["默认", "好友", ...],
  "users": [
    {"id": "uuid", "username": "xxx", "group": "默认", "last_download": "2026-01-01T00:00:00", "note": ""}
  ]
}
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .storage import load_users, save_users

router = APIRouter()


class UserIn(BaseModel):
    username: str = Field(..., min_length=1)
    group: str = "默认"
    note: str = ""


class UserPatch(BaseModel):
    username: Optional[str] = None
    group: Optional[str] = None
    note: Optional[str] = None
    last_download: Optional[str] = None  # ISO


class GroupIn(BaseModel):
    name: str = Field(..., min_length=1)


@router.get("")
def list_users() -> dict:
    return load_users()


@router.post("")
def add_user(payload: UserIn) -> dict:
    data = load_users()
    if any(u["username"].lower() == payload.username.lower() for u in data["users"]):
        raise HTTPException(409, f"用户已存在: {payload.username}")
    if payload.group not in data["groups"]:
        data["groups"].append(payload.group)
    user = {
        "id": uuid.uuid4().hex[:8],
        "username": payload.username.lstrip("@"),
        "group": payload.group,
        "note": payload.note,
        "last_download": None,
        "created_at": datetime.utcnow().isoformat(timespec="seconds"),
    }
    data["users"].append(user)
    save_users(data)
    return user


@router.patch("/{user_id}")
def update_user(user_id: str, payload: UserPatch) -> dict:
    data = load_users()
    for u in data["users"]:
        if u["id"] == user_id:
            if payload.username is not None:
                u["username"] = payload.username.lstrip("@")
            if payload.group is not None:
                u["group"] = payload.group
                if payload.group not in data["groups"]:
                    data["groups"].append(payload.group)
            if payload.note is not None:
                u["note"] = payload.note
            if payload.last_download is not None:
                u["last_download"] = payload.last_download
            save_users(data)
            return u
    raise HTTPException(404, "用户不存在")


@router.delete("/{user_id}")
def delete_user(user_id: str) -> dict:
    data = load_users()
    before = len(data["users"])
    data["users"] = [u for u in data["users"] if u["id"] != user_id]
    if len(data["users"]) == before:
        raise HTTPException(404, "用户不存在")
    save_users(data)
    return {"ok": True}


@router.get("/groups")
def list_groups() -> list[str]:
    return load_users()["groups"]


@router.post("/groups")
def add_group(payload: GroupIn) -> list[str]:
    data = load_users()
    if payload.name not in data["groups"]:
        data["groups"].append(payload.name)
        save_users(data)
    return data["groups"]


@router.delete("/groups/{name}")
def delete_group(name: str) -> dict:
    data = load_users()
    if name == "默认":
        raise HTTPException(400, "默认分组不可删除")
    if name not in data["groups"]:
        raise HTTPException(404, "分组不存在")
    # 关联用户回退到默认
    for u in data["users"]:
        if u["group"] == name:
            u["group"] = "默认"
    data["groups"] = [g for g in data["groups"] if g != name]
    save_users(data)
    return {"ok": True}
