import { Settings, Activity, Database, Box, Power, Languages } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { cn } from '../lib/cn';

export function TopBar() {
  const connected = useStore((s) => s.connected);
  const version = useStore((s) => s.galleryDlVersion);
  const archiveTotal = useStore((s) => s.archiveTotal);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);
  const setArchiveOpen = useStore((s) => s.setArchiveOpen);
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);
  const t = useT();

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/80 bg-zinc-950/40 backdrop-blur">
      <div
        className="flex items-center gap-3 select-none"
        title="InstaHam · Made by FruityMaxine · 2026"
      >
        <div className="grid h-8 w-8 place-items-center rounded-md bg-accent/15 ring-1 ring-accent/40">
          <Box className="h-4 w-4 text-accent" />
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-[15px] font-semibold tracking-tight text-zinc-100">InstaHam</h1>
          <span className="text-[11px] text-zinc-500 font-mono">{t('topbar.subtitle')}</span>
        </div>
      </div>

      <div className="flex items-center gap-5 text-[12px]">
        <Stat icon={<Activity className="h-3.5 w-3.5" />} label={t('topbar.connection')}>
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                connected ? 'bg-accent animate-pulse-dot' : 'bg-zinc-600',
              )}
            />
            <span className={cn('font-mono', connected ? 'text-accent' : 'text-zinc-500')}>
              {connected ? t('topbar.live') : t('topbar.offline')}
            </span>
          </span>
        </Stat>
        <Stat icon={<Box className="h-3.5 w-3.5" />} label="gallery-dl">
          <span className="font-mono text-zinc-200">{version || '--'}</span>
        </Stat>
        <button
          onClick={() => setArchiveOpen(true)}
          className="flex items-center gap-2 px-1 py-0.5 -mx-1 rounded hover:bg-zinc-800/40 transition-colors group"
          title={t('topbar.archive')}
          aria-label="archive"
        >
          <span className="text-zinc-600 group-hover:text-zinc-400"><Database className="h-3.5 w-3.5" /></span>
          <span className="label">{t('topbar.archived')}</span>
          <span className="font-mono text-zinc-100 text-[14px]">
            {archiveTotal.toLocaleString()}
          </span>
        </button>
        <button
          className="btn-ghost h-8 px-2 gap-1.5"
          onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
          title={t('topbar.langTitle')}
          aria-label="language"
        >
          <Languages className="h-3.5 w-3.5" />
          <span className="font-mono text-[11px] uppercase">{locale}</span>
        </button>
        <button className="btn-ghost" onClick={() => setDrawerOpen(true)} aria-label="settings">
          <Settings className="h-4 w-4" />
          <span>{t('topbar.settings')}</span>
        </button>
        <button
          className="btn-ghost hover:!text-rose-400 hover:!bg-rose-500/10"
          onClick={async () => {
            if (!confirm(t('topbar.exit.confirm'))) return;
            try {
              await api.shutdown();
            } catch {
              // 进程会立即退出，可能 fetch 也来不及完成 — 忽略错误
            }
            const bye = t('topbar.exit.bye');
            const hint = t('topbar.exit.byeHint');
            setTimeout(() => {
              document.body.innerHTML =
                `<div style="height:100vh;display:grid;place-items:center;font-family:system-ui;color:#71717a;background:#09090b">` +
                `<div style="text-align:center"><div style="font-size:14px">${bye}</div>` +
                `<div style="margin-top:6px;font-size:11px">${hint}</div></div></div>`;
            }, 500);
          }}
          aria-label="exit"
          title={t('topbar.exit.title')}
        >
          <Power className="h-4 w-4" />
          <span>{t('topbar.exit')}</span>
        </button>
      </div>
    </header>
  );
}

function Stat({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-600">{icon}</span>
      <span className="label">{label}</span>
      <span>{children}</span>
    </div>
  );
}
