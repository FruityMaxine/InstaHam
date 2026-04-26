import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { cn } from '../lib/cn';

export function ProgressBars() {
  const total = useStore((s) => s.totalUsers);
  const idx = useStore((s) => s.currentUserIndex);
  const user = useStore((s) => s.currentUser);
  const files = useStore((s) => s.currentUserFiles);
  const skips = useStore((s) => s.currentUserSkips);
  const running = useStore((s) => s.running);
  const t = useT();

  const totalPct = total > 0 ? Math.min(100, ((idx - 1) / total) * 100) : 0;
  return (
    <div className="border-t border-zinc-800/80 px-4 py-3 space-y-3">
      <Bar
        label={t('progress.total')}
        meta={total > 0 ? `${Math.max(0, idx)} / ${total}` : t('progress.idle')}
        pct={totalPct}
        running={running}
      />
      <Bar
        label={t('progress.current')}
        meta={user ? t('progress.fileSkip', { user, files, skips }) : '—'}
        pct={undefined}
        running={running && !!user}
      />
    </div>
  );
}

function Bar({
  label,
  meta,
  pct,
  running,
}: {
  label: string;
  meta: string;
  pct: number | undefined;
  running: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="label">{label}</span>
        <span className="font-mono text-[11px] text-zinc-400">{meta}</span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden relative">
        {pct !== undefined ? (
          <div
            className={cn(
              'h-full bg-accent rounded-full transition-[width] duration-500 ease-out',
              !running && 'opacity-50',
            )}
            style={{ width: `${pct}%` }}
          />
        ) : running ? (
          // 不定进度：流动条横扫 0~100%
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-accent to-transparent animate-slide-x" />
        ) : null}
      </div>
    </div>
  );
}
