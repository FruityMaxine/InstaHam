import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, type User } from '../lib/api';
import { UserRow } from './UserRow';
import { cn } from '../lib/cn';

export function Sidebar() {
  const users = useStore((s) => s.users);
  const groups = useStore((s) => s.groups);
  const search = useStore((s) => s.search);
  const setSearch = useStore((s) => s.setSearch);
  const activeGroup = useStore((s) => s.activeGroup);
  const setActiveGroup = useStore((s) => s.setActiveGroup);
  const setUsers = useStore((s) => s.setUsers);
  const selectedUserIds = useStore((s) => s.selectedUserIds);
  const selectAllVisible = useStore((s) => s.selectAllVisible);
  const clearSelection = useStore((s) => s.clearSelection);

  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftGroup, setDraftGroup] = useState(groups[0] ?? '默认');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = users.filter((u) => {
      const matchSearch = !q || u.username.toLowerCase().includes(q) || (u.note ?? '').toLowerCase().includes(q);
      const matchGroup = activeGroup === 'all' || u.group === activeGroup;
      return matchSearch && matchGroup;
    });
    const map: Record<string, User[]> = {};
    for (const u of visible) (map[u.group] ||= []).push(u);
    return map;
  }, [users, search, activeGroup]);

  const visibleIds = Object.values(grouped).flat().map((u) => u.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedUserIds.has(id));

  async function handleAdd() {
    if (!draftName.trim()) return;
    try {
      const u = await api.addUser({ username: draftName.trim(), group: draftGroup });
      setUsers([...users, u]);
      setDraftName('');
      setAdding(false);
    } catch (e) {
      alert(`添加失败：${(e as Error).message}`);
    }
  }

  return (
    <aside className="panel flex flex-col min-h-0">
      <div className="panel-h">
        <div className="flex items-center gap-2">
          <span className="label">用户列表</span>
          <span className="chip font-mono">{users.length}</span>
        </div>
        <button
          className="btn-ghost h-7 px-2 text-[12px]"
          onClick={() => setAdding((v) => !v)}
          aria-label="添加用户"
        >
          <Plus className="h-3.5 w-3.5" />
          新增
        </button>
      </div>

      {/* 搜索 + 分组 */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-zinc-800/60">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索 用户名 / 备注"
            className="input pl-8 font-mono text-[13px]"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              onClick={() => setSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          <GroupTab label="全部" active={activeGroup === 'all'} onClick={() => setActiveGroup('all')} count={users.length} />
          {groups.map((g) => (
            <GroupTab
              key={g}
              label={g}
              active={activeGroup === g}
              onClick={() => setActiveGroup(g)}
              count={users.filter((u) => u.group === g).length}
            />
          ))}
        </div>
      </div>

      {/* 添加面板 */}
      {adding && (
        <div className="border-b border-zinc-800/60 p-3 space-y-2 animate-fade-in">
          <input
            autoFocus
            className="input font-mono"
            placeholder="instagram 用户名（不带 @）"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <div className="flex gap-2">
            <select
              className="input flex-1"
              value={draftGroup}
              onChange={(e) => setDraftGroup(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={handleAdd}>添加</button>
          </div>
        </div>
      )}

      {/* 批量勾选 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60 text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
          <input
            type="checkbox"
            className="accent-accent h-3.5 w-3.5"
            checked={allSelected}
            onChange={() => selectAllVisible(visibleIds)}
          />
          <span>勾选当前 ({visibleIds.length})</span>
        </label>
        <button
          className="text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
          disabled={selectedUserIds.size === 0}
          onClick={() => clearSelection()}
        >
          清空选择 ({selectedUserIds.size})
        </button>
      </div>

      {/* 列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <Empty />
        ) : (
          Object.entries(grouped).map(([g, list]) => (
            <div key={g} className="border-b border-zinc-900/80 last:border-b-0">
              <button
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-[12px] text-zinc-400 hover:bg-zinc-900/40',
                )}
                onClick={() => setCollapsed((m) => ({ ...m, [g]: !m[g] }))}
              >
                <span className="flex items-center gap-1.5">
                  <ChevronDown className={cn('h-3 w-3 transition', collapsed[g] && '-rotate-90')} />
                  <span className="font-medium">{g}</span>
                  <span className="font-mono text-zinc-600">{list.length}</span>
                </span>
              </button>
              {!collapsed[g] && (
                <ul className="pb-1">
                  {list.map((u) => (
                    <UserRow key={u.id} user={u} />
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

function GroupTab({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 rounded-full px-2.5 h-6 text-[11px] transition-colors',
        active ? 'bg-accent/15 text-accent ring-1 ring-accent/40' : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200',
      )}
    >
      <span>{label}</span>
      <span className="font-mono opacity-70">{count}</span>
    </button>
  );
}

function Empty() {
  return (
    <div className="p-8 text-center text-[12px] text-zinc-600">
      <p>暂无匹配用户。</p>
      <p className="mt-1">点右上「新增」添加。</p>
    </div>
  );
}
