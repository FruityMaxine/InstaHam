import { Settings, Activity, Database, Box, Power } from 'lucide-react';
import { useStore } from '../lib/store';
import { api } from '../lib/api';
import { cn } from '../lib/cn';

export function TopBar() {
  const connected = useStore((s) => s.connected);
  const version = useStore((s) => s.galleryDlVersion);
  const archiveTotal = useStore((s) => s.archiveTotal);
  const setDrawerOpen = useStore((s) => s.setDrawerOpen);

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
          <span className="text-[11px] text-zinc-500 font-mono">gallery-dl 控制台</span>
        </div>
      </div>

      <div className="flex items-center gap-5 text-[12px]">
        <Stat icon={<Activity className="h-3.5 w-3.5" />} label="连接">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                connected ? 'bg-accent animate-pulse-dot' : 'bg-zinc-600',
              )}
            />
            <span className={cn('font-mono', connected ? 'text-accent' : 'text-zinc-500')}>
              {connected ? 'live' : 'offline'}
            </span>
          </span>
        </Stat>
        <Stat icon={<Box className="h-3.5 w-3.5" />} label="gallery-dl">
          <span className="font-mono text-zinc-200">{version || '--'}</span>
        </Stat>
        <Stat icon={<Database className="h-3.5 w-3.5" />} label="已归档">
          <span className="font-mono text-zinc-100 text-[14px]">{archiveTotal.toLocaleString()}</span>
        </Stat>
        <button className="btn-ghost" onClick={() => setDrawerOpen(true)} aria-label="设置">
          <Settings className="h-4 w-4" />
          <span>设置</span>
        </button>
        <button
          className="btn-ghost hover:!text-rose-400 hover:!bg-rose-500/10"
          onClick={async () => {
            if (!confirm('退出 InstaHam？后端进程将完全终止。')) return;
            try {
              await api.shutdown();
            } catch {
              // ignore — 进程会立即退出，可能 fetch 也来不及完成
            }
            // 给后端 0.5s 退出，前端贴一个空白挽留页
            setTimeout(() => {
              document.body.innerHTML =
                '<div style="height:100vh;display:grid;place-items:center;font-family:system-ui;color:#71717a;background:#09090b">' +
                '<div style="text-align:center"><div style="font-size:14px">InstaHam 已退出</div>' +
                '<div style="margin-top:6px;font-size:11px">可以关闭此标签页。</div></div></div>';
            }, 500);
          }}
          aria-label="退出"
          title="退出应用（终止后端进程）"
        >
          <Power className="h-4 w-4" />
          <span>退出</span>
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
