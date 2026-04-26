import { useEffect, useRef } from 'react';
import { Pause, Play, Trash2, Copy } from 'lucide-react';
import { useStore } from '../lib/store';
import { useT } from '../lib/i18n';
import { cn } from '../lib/cn';

const TYPE_STYLES: Record<string, string> = {
  error: 'text-rose-400',
  warning: 'text-amber-400',
  file: 'text-zinc-200',
  skip: 'text-zinc-500',
  done: 'text-accent',
  user_start: 'text-accent',
  meta: 'text-zinc-500',
  started: 'text-zinc-500',
  log: 'text-zinc-400',
  all_done: 'text-accent',
};

export function LogStream() {
  const logs = useStore((s) => s.logs);
  const paused = useStore((s) => s.logPaused);
  const togglePause = useStore((s) => s.togglePause);
  const clear = useStore((s) => s.clearLogs);
  const running = useStore((s) => s.running);
  const t = useT();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (paused) return;
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [logs, paused]);

  function copyAll() {
    const text = logs.map((l) => `[${l.type}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
  }

  return (
    <div className="panel flex-1 min-h-0 flex flex-col">
      <div className="panel-h">
        <div className="flex items-center gap-2">
          <span className="label">{t('log.title')}</span>
          <span className="chip font-mono">{logs.length}</span>
          {running && (
            <span className="flex items-center gap-1 text-[11px] text-accent font-mono">
              <span className="h-1 w-1 rounded-full bg-accent animate-pulse-dot" />
              {t('log.streaming')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button className="btn-ghost h-7 px-2" onClick={togglePause}>
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{paused ? t('log.resume') : t('log.pause')}</span>
          </button>
          <button className="btn-ghost h-7 px-2" onClick={copyAll}>
            <Copy className="h-3.5 w-3.5" />
            <span className="text-[11px]">{t('log.copy')}</span>
          </button>
          <button className="btn-ghost h-7 px-2 hover:text-rose-400" onClick={clear}>
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-[11px]">{t('log.clear')}</span>
          </button>
        </div>
      </div>

      <div
        ref={ref}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-relaxed"
      >
        {logs.length === 0 ? (
          <Idle running={running} t={t} />
        ) : (
          logs.map((l) => (
            <div key={l.id} className={cn('whitespace-pre-wrap break-all', TYPE_STYLES[l.type] ?? '')}>
              <span className="text-zinc-700 select-none mr-2">{tag(l.type)}</span>
              {l.user && <span className="text-accent/80 mr-1">@{l.user}</span>}
              {l.type === 'skip' && l.reason && (
                <span
                  className={cn(
                    'inline-block mr-2 px-1.5 py-0 rounded text-[10px] font-mono uppercase tracking-wide align-middle',
                    l.reason === 'archive'
                      ? 'bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30'
                      : l.reason === 'disk'
                      ? 'bg-zinc-700/40 text-zinc-400 ring-1 ring-zinc-600/40'
                      : 'bg-zinc-800 text-zinc-500',
                  )}
                  title={t(`skip.${l.reason}`)}
                >
                  {l.reason}
                </span>
              )}
              <span>{l.text || (l.type === 'log' ? '' : `(${l.type})`)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function tag(t: string): string {
  const map: Record<string, string> = {
    file: '+',
    skip: '~',
    error: '!',
    warning: '?',
    done: '✓',
    started: '›',
    user_start: '▸',
    meta: 'i',
    log: ' ',
    all_done: '✓',
  };
  return map[t] ?? '·';
}

function Idle({
  running,
  t,
}: {
  running: boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  if (running) {
    return (
      <div className="space-y-1.5">
        {[80, 60, 90, 50].map((w, i) => (
          <div key={i} className="shimmer-mask h-3 rounded bg-zinc-800/40" style={{ width: `${w}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid h-full place-items-center text-zinc-600">
      <div className="text-center">
        <div className="text-[12px]">{t('log.idle1')}</div>
        <div className="mt-1 text-[11px] text-zinc-700">{t('log.idle2')}</div>
      </div>
    </div>
  );
}
