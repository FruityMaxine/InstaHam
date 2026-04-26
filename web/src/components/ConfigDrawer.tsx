import { useEffect, useState } from 'react';
import { X, Save, FlaskConical, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../lib/store';
import { api, type Config } from '../lib/api';
import { cn } from '../lib/cn';

export function ConfigDrawer() {
  const open = useStore((s) => s.drawerOpen);
  const setOpen = useStore((s) => s.setDrawerOpen);

  const [cfg, setCfg] = useState<Config | null>(null);
  const [cookies, setCookies] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    api.getConfig().then((c) => {
      setCfg(c);
      setCookies(c.cookies ?? '');
    });
  }, [open]);

  async function save() {
    if (!cfg) return;
    setSaving(true);
    setSaveResult(null);
    try {
      await api.patchConfig({
        download_dir: cfg.download_dir,
        concurrency: cfg.concurrency,
        videos_mode: cfg.videos_mode,
        ffmpeg_location: cfg.ffmpeg_location,
        include: cfg.include,
      });
      const r = await api.saveCookies(cookies);
      setSaveResult({
        ok: true,
        msg: `已保存 · cookies ${r.bytes} 字节 · 配置已更新`,
      });
      // 3 秒后自动消失
      setTimeout(() => setSaveResult((cur) => (cur && cur.ok ? null : cur)), 3000);
    } catch (e) {
      setSaveResult({ ok: false, msg: `保存失败：${(e as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await api.testCookies('instagram');
      setTestResult({
        ok: r.ok,
        msg: r.ok ? `OK · ${r.stdout.trim().slice(0, 80)}` : (r.stderr || `exit ${r.code}`).slice(0, 200),
      });
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTesting(false);
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
      <aside
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[480px] max-w-[92vw] panel rounded-none border-l border-zinc-800',
          'transition-transform duration-300 ease-out flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="panel-h">
          <div>
            <div className="text-[14px] font-semibold text-zinc-100">设置</div>
            <div className="text-[11px] text-zinc-500">cookies · 下载目录 · 视频质量</div>
          </div>
          <button className="btn-ghost h-7 w-7 p-0" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
          {!cfg ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="shimmer-mask h-8 rounded bg-zinc-800/50" />
              ))}
            </div>
          ) : (
            <>
              <Field label="Cookies (Netscape 格式)">
                <textarea
                  value={cookies}
                  onChange={(e) => setCookies(e.target.value)}
                  rows={10}
                  className="input min-h-[180px] font-mono text-[11px] leading-snug"
                  placeholder="# Netscape HTTP Cookie File&#10;.instagram.com  TRUE  /  TRUE  ...  sessionid  ..."
                />
                <div className="text-[11px] text-zinc-500 mt-1">
                  推荐用 Chrome 扩展「Get cookies.txt LOCALLY」导出。
                </div>
              </Field>

              <Field label="下载目录">
                <input
                  className="input font-mono text-[12px]"
                  value={cfg.download_dir}
                  onChange={(e) => setCfg({ ...cfg, download_dir: e.target.value })}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="并发数">
                  <input
                    type="number"
                    min={1}
                    max={8}
                    className="input font-mono"
                    value={cfg.concurrency}
                    onChange={(e) => setCfg({ ...cfg, concurrency: Number(e.target.value) })}
                  />
                </Field>
                <Field label="视频模式">
                  <select
                    className="input"
                    value={cfg.videos_mode}
                    onChange={(e) => setCfg({ ...cfg, videos_mode: e.target.value })}
                  >
                    <option value="true">true · DASH 最高质量（需 ffmpeg）</option>
                    <option value="merged">merged · 预合并（无 ffmpeg）</option>
                    <option value="false">false · 跳过视频</option>
                  </select>
                </Field>
              </div>

              <Field label="ffmpeg 路径">
                <input
                  className="input font-mono text-[12px]"
                  value={cfg.ffmpeg_location}
                  onChange={(e) => setCfg({ ...cfg, ffmpeg_location: e.target.value })}
                  placeholder="C:\ffmpeg\bin\ffmpeg.exe"
                />
              </Field>

              <Field label="抓取项 (instagram.include)">
                <div className="flex flex-wrap gap-1.5">
                  {['posts', 'stories', 'highlights', 'reels', 'tagged', 'avatar'].map((k) => {
                    const on = cfg.include.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setCfg({
                            ...cfg,
                            include: on ? cfg.include.filter((x) => x !== k) : [...cfg.include, k],
                          })
                        }
                        className={cn(
                          'rounded-full px-2.5 h-6 text-[11px] font-mono transition-colors',
                          on
                            ? 'bg-accent/15 text-accent ring-1 ring-accent/40'
                            : 'bg-zinc-800/60 text-zinc-400 hover:text-zinc-200',
                        )}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </>
          )}
        </div>

        <div className="border-t border-zinc-800/80">
          {/* 反馈条：保存优先，其次 cookies 测试 */}
          {(saveResult || testResult) && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono border-b border-zinc-800/80 animate-fade-in',
                (saveResult ?? testResult)!.ok
                  ? 'bg-accent/10 text-accent'
                  : 'bg-rose-500/10 text-rose-400',
              )}
            >
              {(saveResult ?? testResult)!.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate flex-1">{(saveResult ?? testResult)!.msg}</span>
              <button
                className="text-current opacity-60 hover:opacity-100"
                onClick={() => {
                  setSaveResult(null);
                  setTestResult(null);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="p-3 flex items-center gap-2">
            <button className="btn-outline" disabled={testing} onClick={runTest}>
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
              <span>测试 cookies</span>
            </button>
            <div className="flex-1" />
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              保存
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="label mb-1.5">{label}</div>
      {children}
    </div>
  );
}
