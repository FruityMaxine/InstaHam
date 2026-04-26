// 启动下载前的浏览器 cookies 门禁。
// 仅当 cfg.cookies_source === 'browser' 时被 TaskPanel 调用。
//
// 三种状态：
//   - notLogged   cookies 文件不存在（用户从未在该浏览器登录 IG）
//   - running     该浏览器进程在跑，但不是当前 UI 浏览器 -> 让用户去关
//   - self        该浏览器进程在跑且就是当前 UI 浏览器 -> 警告下载启动后自己关
//   - ready       直接放行
//
// 任何状态都返回 Promise<boolean>：true=继续启动下载，false=取消。

import { Loader2, AlertTriangle, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useT } from '../lib/i18n';
import { detectCurrentBrowser } from '../lib/detectBrowser';
import { cn } from '../lib/cn';

type GateState = 'checking' | 'ready' | 'notLogged' | 'running' | 'self' | 'cancelled';

export function BrowserCookieGate({
  browser,
  onResolve,
}: {
  browser: string; // 'edge' | 'chrome' | ...
  onResolve: (proceed: boolean) => void;
}) {
  const t = useT();
  const [state, setState] = useState<GateState>('checking');
  const labelMap: Record<string, string> = {
    edge: 'Microsoft Edge',
    chrome: 'Google Chrome',
    firefox: 'Firefox',
    brave: 'Brave',
    vivaldi: 'Vivaldi',
    opera: 'Opera',
    chromium: 'Chromium',
  };
  const label = labelMap[browser] ?? browser;

  async function check() {
    setState('checking');
    try {
      const r = await api.browserStatus(browser);
      if (!r.cookies_exists) return setState('notLogged');
      if (!r.running) return setState('ready');
      // running 了 — 看是不是当前 UI 浏览器
      const current = detectCurrentBrowser();
      setState(current === browser ? 'self' : 'running');
    } catch {
      // 探测失败兜底放行
      setState('ready');
    }
  }

  useEffect(() => {
    check();
  }, [browser]);

  // ready → 自动放行
  useEffect(() => {
    if (state === 'ready') onResolve(true);
    if (state === 'cancelled') onResolve(false);
  }, [state]); // eslint-disable-line

  if (state === 'ready' || state === 'cancelled') return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="panel w-[480px] max-w-[92vw] flex flex-col">
        <div className="panel-h">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={cn(
                'h-4 w-4',
                state === 'self' ? 'text-amber-400' : 'text-zinc-400',
              )}
            />
            <span className="text-[13px] font-semibold text-zinc-100">
              {state === 'checking' && t('gate.checking')}
              {state === 'notLogged' && t('gate.title.notLogged')}
              {state === 'running' && t('gate.title.running', { browser: label })}
              {state === 'self' && t('gate.title.self')}
            </span>
          </div>
          <button
            className="btn-ghost h-7 w-7 p-0"
            onClick={() => setState('cancelled')}
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 text-[13px] text-zinc-300 leading-relaxed whitespace-pre-line">
          {state === 'checking' && (
            <div className="flex items-center gap-2 text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('gate.checking')}</span>
            </div>
          )}
          {state === 'notLogged' && t('gate.body.notLogged', { browser: label })}
          {state === 'running' && t('gate.body.running', { browser: label })}
          {state === 'self' && t('gate.body.self', { browser: label })}
        </div>

        <div className="border-t border-zinc-800/80 p-3 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => setState('cancelled')}>
            {t('gate.cancel')}
          </button>
          {state === 'running' && (
            <button className="btn-primary" onClick={check}>
              {t('gate.retry')}
            </button>
          )}
          {state === 'self' && (
            <button className="btn-primary" onClick={() => onResolve(true)}>
              {t('gate.confirmSelf')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
