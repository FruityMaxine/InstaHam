import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Search, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, type User } from '../lib/api';
import { useT, displayGroupName } from '../lib/i18n';
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
  const locale = useStore((s) => s.locale);
  const t = useT();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // 新建分组 inline 输入态
  const [addingGroup, setAddingGroup] = useState(false);
  const [draftGroupName, setDraftGroupName] = useState('');

  // 添加目标分组：选中具体分组 -> 该分组；选中 All / 默认 -> 默认
  const targetGroup = activeGroup === 'all' ? '默认' : activeGroup;
  const cleanedSearch = search.trim().replace(/^@+/, '');
  const canAdd = cleanedSearch.length > 0;

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = users.filter((u) => {
      const matchSearch =
        !q || u.username.toLowerCase().includes(q) || (u.note ?? '').toLowerCase().includes(q);
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
    if (!canAdd) return;
    try {
      const u = await api.addUser({ username: cleanedSearch, group: targetGroup });
      setUsers([...users, u]);
      setSearch(''); // 加完清空，避免误重复
    } catch (e) {
      alert(t('sidebar.addFail', { msg: (e as Error).message }));
    }
  }

  async function handleAddGroup() {
    const name = draftGroupName.trim();
    if (!name) {
      setAddingGroup(false);
      return;
    }
    try {
      const newGroups = await api.addGroup(name);
      setUsers(users, newGroups);
      setDraftGroupName('');
      setAddingGroup(false);
    } catch (e) {
      alert(t('group.addFail', { msg: (e as Error).message }));
    }
  }

  async function handleDeleteGroup(name: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(t('group.deleteConfirm', { name: displayGroupName(name, locale) }))) return;
    try {
      await api.deleteGroup(name);
      const fresh = await api.listUsers();
      setUsers(fresh.users, fresh.groups);
      if (activeGroup === name) setActiveGroup('all');
    } catch (err) {
      alert(t('group.deleteFail', { msg: (err as Error).message }));
    }
  }

  // Add 按钮 tooltip：根据是否能添加给出不同提示
  const addTitle = canAdd
    ? t('sidebar.addTo', { name: cleanedSearch, group: displayGroupName(targetGroup, locale) })
    : t('sidebar.addEmpty');

  return (
    <aside className="panel flex flex-col min-h-0">
      <div className="panel-h">
        <div className="flex items-center gap-2">
          <span className="label">{t('sidebar.title')}</span>
          <span className="chip font-mono">{users.length}</span>
        </div>
        <button
          className="btn-ghost h-7 px-2 text-[12px] disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleAdd}
          disabled={!canAdd}
          title={addTitle}
          aria-label="add"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('sidebar.add')}
        </button>
      </div>

      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-zinc-800/60">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAdd) handleAdd();
            }}
            placeholder={t('sidebar.search')}
            className="input pl-8 pr-8 font-mono text-[13px]"
          />
          {search && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200"
              onClick={() => setSearch('')}
              aria-label="clear"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 items-center">
          <GroupTab
            label={t('sidebar.all')}
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
            count={users.length}
          />
          {groups.map((g) => (
            <GroupTab
              key={g}
              label={displayGroupName(g, locale)}
              active={activeGroup === g}
              onClick={() => setActiveGroup(g)}
              count={users.filter((u) => u.group === g).length}
              onDelete={g === '默认' ? undefined : (e) => handleDeleteGroup(g, e)}
              deleteTitle={t('group.deleteTitle')}
            />
          ))}
          {addingGroup ? (
            <input
              autoFocus
              className="h-6 w-24 rounded-full bg-zinc-900 border border-accent/40 px-2 text-[11px] text-zinc-100 outline-none focus:ring-2 focus:ring-accent/30"
              placeholder={t('group.addPlaceholder')}
              value={draftGroupName}
              onChange={(e) => setDraftGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddGroup();
                if (e.key === 'Escape') {
                  setDraftGroupName('');
                  setAddingGroup(false);
                }
              }}
              onBlur={handleAddGroup}
            />
          ) : (
            <button
              className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 hover:text-accent hover:bg-accent/10 transition"
              onClick={() => setAddingGroup(true)}
              title={t('group.addTitle')}
              aria-label="new-group"
            >
              <Plus className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/60 text-[11px]">
        <label className="flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-200">
          <input
            type="checkbox"
            className="accent-accent h-3.5 w-3.5"
            checked={allSelected}
            onChange={() => selectAllVisible(visibleIds)}
          />
          <span>{t('sidebar.selectVisible', { n: visibleIds.length })}</span>
        </label>
        <button
          className="text-zinc-500 hover:text-zinc-200 disabled:opacity-40"
          disabled={selectedUserIds.size === 0}
          onClick={() => clearSelection()}
        >
          {t('sidebar.clearSel', { n: selectedUserIds.size })}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {Object.keys(grouped).length === 0 ? (
          <Empty t={t} />
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
                  <span className="font-medium">{displayGroupName(g, locale)}</span>
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
  onDelete,
  deleteTitle,
}: {
  label: string;
  active: boolean;
  count: number;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  deleteTitle?: string;
}) {
  return (
    <span
      className={cn(
        'group/tab inline-flex items-center rounded-full transition-colors',
        active
          ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
          : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200',
      )}
    >
      <button
        onClick={onClick}
        className="flex items-center gap-1 px-2.5 h-6 text-[11px]"
      >
        <span>{label}</span>
        <span className="font-mono opacity-70">{count}</span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          title={deleteTitle}
          aria-label="delete-group"
          className="grid h-6 w-5 place-items-center text-zinc-600 opacity-0 group-hover/tab:opacity-100 hover:text-rose-400 transition"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

function Empty({ t }: { t: (k: string) => string }) {
  return (
    <div className="p-8 text-center text-[12px] text-zinc-600">
      <p>{t('sidebar.empty1')}</p>
      <p className="mt-1">{t('sidebar.empty2')}</p>
    </div>
  );
}
