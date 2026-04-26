import { useState } from 'react';
import { Pencil, Trash2, Check, X, Clock } from 'lucide-react';
import type { User } from '../lib/api';
import { api } from '../lib/api';
import { useStore } from '../lib/store';
import { cn } from '../lib/cn';

export function UserRow({ user }: { user: User }) {
  const users = useStore((s) => s.users);
  const setUsers = useStore((s) => s.setUsers);
  const groups = useStore((s) => s.groups);
  const selected = useStore((s) => s.selectedUserIds.has(user.id));
  const toggleSelected = useStore((s) => s.toggleSelected);
  const currentUser = useStore((s) => s.currentUser);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.username);
  const [grp, setGrp] = useState(user.group);

  async function save() {
    try {
      const u = await api.updateUser(user.id, { username: name, group: grp });
      setUsers(users.map((x) => (x.id === u.id ? u : x)));
      setEditing(false);
    } catch (e) {
      alert(`保存失败：${(e as Error).message}`);
    }
  }
  async function remove() {
    if (!confirm(`删除 @${user.username}？`)) return;
    await api.deleteUser(user.id);
    setUsers(users.filter((x) => x.id !== user.id));
  }

  const active = currentUser === user.username;

  return (
    <li
      className={cn(
        'group relative flex items-center gap-2 px-3 py-1.5 hover:bg-zinc-900/60 transition-colors',
        selected && 'bg-accent/[0.06]',
      )}
    >
      <input
        type="checkbox"
        className="accent-accent h-3.5 w-3.5 shrink-0"
        checked={selected}
        onChange={() => toggleSelected(user.id)}
      />
      {active && <span className="absolute left-0 top-0 h-full w-[2px] bg-accent" />}
      {editing ? (
        <>
          <input
            className="input h-7 font-mono text-[12px] flex-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <select
            className="input h-7 px-2 text-[11px] w-20"
            value={grp}
            onChange={(e) => setGrp(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <button className="btn-ghost h-6 w-6 p-0" onClick={save}>
            <Check className="h-3.5 w-3.5 text-accent" />
          </button>
          <button className="btn-ghost h-6 w-6 p-0" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <div className={cn('font-mono text-[13px] truncate', active ? 'text-accent' : 'text-zinc-100')}>
              @{user.username}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
              <Clock className="h-2.5 w-2.5" />
              <span>{user.last_download ? user.last_download.replace('T', ' ') : '从未下载'}</span>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
            <button className="btn-ghost h-6 w-6 p-0" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" />
            </button>
            <button className="btn-ghost h-6 w-6 p-0 hover:text-rose-400" onClick={remove}>
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </>
      )}
    </li>
  );
}
