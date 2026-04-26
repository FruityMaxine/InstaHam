import { useEffect, useState } from 'react';
import {
  X, RefreshCcw, Database, Trash2, AlertTriangle, Loader2, Sparkles, CheckCircle2,
} from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { cn } from '../lib/cn';

type Summary = {
  total: number;
  orphans: number;
  users: { username: string; on_disk: number; in_archive: number }[];
};

export function ArchiveManager() {
  const open = useStore((s) => s.archiveOpen);
  const setOpen = useStore((s) => s.setArchiveOpen);
  const setArchiveTotal = useStore((s) => s.setArchiveTotal);
  const t = useT();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null); // 表示哪个操作正在跑
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const s = await api.archiveSummary();
      setSummary(s);
      setArchiveTotal(s.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  function flash(ok: boolean, msg: string) {
    setToast({ ok, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function syncNow() {
    setBusy('sync');
    try {
      const r = await api.archiveSync();
      flash(true, r.removed > 0 ? t('arch.syncDone', { n: r.removed }) : t('arch.syncNothing'));
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteByUser(username: string) {
    if (!confirm(t('arch.deleteUserConfirm', { name: username }))) return;
    setBusy(`user:${username}`);
    try {
      const r = await api.archiveDeleteByUser(username);
      flash(true, t('arch.deleted', { n: r.removed }));
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function deleteAll() {
    if (!confirm(t('arch.deleteAllConfirm'))) return;
    setBusy('all');
    try {
      const r = await api.archiveDeleteAll();
      flash(true, t('arch.deleted', { n: r.removed }));
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity z-40',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none',
          open && 'pointer-events-auto',
        )}
      >
        <div
          className={cn(
            'panel w-full max-w-[720px] max-h-[80vh] flex flex-col transition-all',
            open ? 'opacity-100 scale-100' : 'opacity-0 scale-95',
          )}
        >
          <div className="panel-h">
            <div>
              <div className="text-[14px] font-semibold text-zinc-100 flex items-center gap-2">
                <Database className="h-4 w-4 text-accent" />
                {t('arch.title')}
              </div>
              <div className="text-[11px] text-zinc-500">{t('arch.subtitle')}</div>
            </div>
            <button className="btn-ghost h-7 w-7 p-0" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* 概览数字 */}
          <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-zinc-800/80">
            <Stat label={t('arch.total')} value={summary?.total ?? 0} />
            <Stat
              label={t('arch.userCount', { n: summary?.users.length ?? 0 })}
              value={summary?.users.length ?? 0}
            />
            <Stat
              label={t('arch.orphans')}
              value={summary?.orphans ?? 0}
              warn={(summary?.orphans ?? 0) > 0}
            />
          </div>

          {/* 操作条 */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/80">
            <button className="btn-outline h-7 px-2 text-[11px]" onClick={refresh} disabled={loading}>
              <RefreshCcw className={cn('h-3 w-3', loading && 'animate-spin')} />
              <span>{t('arch.refresh')}</span>
            </button>
            <button
              className="btn-primary h-7 px-3 text-[11px]"
              onClick={syncNow}
              disabled={busy !== null}
            >
              {busy === 'sync' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>{t('arch.syncNow')}</span>
            </button>
            <div className="flex-1" />
            <button
              className="btn-ghost h-7 px-2 text-[11px] hover:!text-rose-400 hover:!bg-rose-500/10"
              onClick={deleteAll}
              disabled={busy !== null || !summary?.total}
            >
              {busy === 'all' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>{t('arch.deleteAll')}</span>
            </button>
          </div>

          {/* 用户表格 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading && !summary ? (
              <div className="space-y-2 p-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="shimmer-mask h-7 rounded bg-zinc-800/50" />
                ))}
              </div>
            ) : !summary || summary.users.length === 0 ? (
              <div className="grid h-full place-items-center text-zinc-600 text-[12px]">
                {t('arch.empty')}
              </div>
            ) : (
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-zinc-950/80 backdrop-blur">
                  <tr className="text-zinc-500 text-[10px] uppercase tracking-wider">
                    <th className="text-left font-normal px-4 py-2">{t('arch.colUsername')}</th>
                    <th className="text-right font-normal px-2 py-2 font-mono">{t('arch.colOnDisk')}</th>
                    <th className="text-right font-normal px-2 py-2 font-mono">{t('arch.colInArchive')}</th>
                    <th className="px-4 py-2 w-8" />
                  </tr>
                </thead>
                <tbody>
                  {summary.users.map((u) => (
                    <tr
                      key={u.username}
                      className="border-t border-zinc-900/60 group hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-2 font-mono text-zinc-100">@{u.username}</td>
                      <td className="px-2 py-2 text-right font-mono text-zinc-300">{u.on_disk}</td>
                      <td className="px-2 py-2 text-right font-mono text-accent/90">{u.in_archive}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          className="btn-ghost h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:!text-rose-400"
                          onClick={() => deleteByUser(u.username)}
                          disabled={busy !== null}
                          title={t('arch.deleteUser')}
                        >
                          {busy === `user:${u.username}` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* toast */}
          {toast && (
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-t border-zinc-800/80 text-[12px] font-mono animate-fade-in',
                toast.ok ? 'text-accent bg-accent/5' : 'text-rose-400 bg-rose-500/5',
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="flex-1">{toast.msg}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: number; warn?: boolean }) {
  return (
    <div>
      <div className="label text-[10px]">{label}</div>
      <div
        className={cn(
          'mt-1 font-mono text-[18px]',
          warn && value > 0 ? 'text-amber-400' : 'text-zinc-100',
        )}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}
