import { useEffect, useState } from 'react';
import { Play, Square, Layers, CheckSquare, Tag, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store';
import { openDownloadWs, api, type DownloadRequest } from '../lib/api';
import { useT, displayGroupName } from '../lib/i18n';
import { ProgressBars } from './ProgressBars';
import { LogStream } from './LogStream';
import { cn } from '../lib/cn';

// 注：BrowserCookieGate / detectBrowser / cookies-from-browser 后端逻辑保留，
// 但本组件不再触发 gate，因为 ConfigDrawer 已移除 cookies source 切换器，
// cookies_source 永远是 'manual'。

export function TaskPanel() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const groups = useStore((s) => s.groups);
  const users = useStore((s) => s.users);
  const selected = useStore((s) => s.selectedUserIds);
  const activeGroup = useStore((s) => s.activeGroup);
  const running = useStore((s) => s.running);
  const ws = useStore((s) => s.ws);
  const startRun = useStore((s) => s.startRun);
  const finishRun = useStore((s) => s.finishRun);
  const pushEvent = useStore((s) => s.pushEvent);
  const locale = useStore((s) => s.locale);
  const t = useT();

  const [adhocText, setAdhocText] = useState('');
  const [groupChoice, setGroupChoice] = useState(activeGroup !== 'all' ? activeGroup : groups[0] ?? '默认');

  // mount 时拉一次 server 缓存的事件，重连后能看到关浏览器期间的进度
  const hydrateLogs = useStore((s) => s.hydrateLogs);
  useEffect(() => {
    api.recentEvents().then((r) => {
      if (r.events && r.events.length) hydrateLogs(r.events);
    }).catch(() => {});
  }, [hydrateLogs]);

  const targetCount =
    mode === 'all'
      ? users.length
      : mode === 'group'
      ? users.filter((u) => u.group === groupChoice).length
      : mode === 'selected'
      ? selected.size
      : adhocText.split(/\s+/).filter(Boolean).length;

  function start() {
    if (running) return;
    const req: DownloadRequest = { mode };
    if (mode === 'selected') req.users = Array.from(selected);
    if (mode === 'group') req.group = groupChoice;
    if (mode === 'adhoc') req.urls = adhocText.split(/\s+/).filter(Boolean);

    const sock = openDownloadWs(req, pushEvent, finishRun);
    startRun(sock);
  }

  function stop() {
    ws?.close();
    finishRun();
  }

  return (
    <section className="flex flex-col min-h-0 gap-4">
      <div className="panel">
        <div className="px-4 py-3 flex items-center gap-3">
          <div className="flex rounded-md border border-zinc-800 p-0.5 bg-zinc-900/40">
            <ModeBtn icon={<Layers className="h-3.5 w-3.5" />} label={t('mode.all')} active={mode === 'all'} onClick={() => setMode('all')} />
            <ModeBtn icon={<Tag className="h-3.5 w-3.5" />} label={t('mode.group')} active={mode === 'group'} onClick={() => setMode('group')} />
            <ModeBtn icon={<CheckSquare className="h-3.5 w-3.5" />} label={t('mode.selected')} active={mode === 'selected'} onClick={() => setMode('selected')} />
            <ModeBtn icon={<Wand2 className="h-3.5 w-3.5" />} label={t('mode.adhoc')} active={mode === 'adhoc'} onClick={() => setMode('adhoc')} />
          </div>

          {mode === 'group' && (
            <select className="input h-9 w-32" value={groupChoice} onChange={(e) => setGroupChoice(e.target.value)}>
              {groups.map((g) => (
                <option key={g} value={g}>{displayGroupName(g, locale)}</option>
              ))}
            </select>
          )}

          {mode === 'adhoc' && (
            <input
              className="input flex-1 font-mono text-[12px]"
              placeholder={t('mode.adhocPlaceholder')}
              value={adhocText}
              onChange={(e) => setAdhocText(e.target.value)}
            />
          )}

          {mode !== 'adhoc' && <div className="flex-1" />}

          <span className="text-[11px] text-zinc-500 font-mono">{t('task.targets', { n: targetCount })}</span>

          {running ? (
            <button className="btn-outline hover:border-rose-500 hover:text-rose-400" onClick={stop}>
              <Square className="h-3.5 w-3.5" />
              {t('task.stop')}
            </button>
          ) : (
            <button className="btn-primary" onClick={start} disabled={targetCount === 0}>
              <Play className="h-3.5 w-3.5" />
              {t('task.start')}
            </button>
          )}
        </div>
        <ProgressBars />
      </div>

      <LogStream />
    </section>
  );
}

function ModeBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        'flex items-center gap-1.5 px-3 h-8 rounded text-[12px] transition-colors',
        active ? 'bg-zinc-800 text-zinc-100 shadow-inner' : 'text-zinc-500 hover:text-zinc-200',
      )}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
