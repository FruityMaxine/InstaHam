// REST + WebSocket 客户端
// dev 走 vite 代理；生产同源直接打到自身

export type User = {
  id: string;
  username: string;
  group: string;
  note: string;
  last_download: string | null;
  created_at: string;
};

export type UsersPayload = { groups: string[]; users: User[] };

export type Config = {
  cookies_path: string;
  download_dir: string;
  concurrency: number;
  include: string[];
  videos_mode: string;
  ffmpeg_location: string;
  cookies?: string;
  cookies_source: 'manual' | 'browser';
  cookies_browser: string; // edge | chrome | firefox | brave | vivaldi | opera | chromium
  parallel_enabled: boolean;
  parallel_workers: number;
  parallel_sleep_seconds: number;
  parallel_jitter: boolean;
  parallel_circuit_breaker: boolean;
};

async function j<T>(r: Response): Promise<T> {
  if (!r.ok) throw new Error((await r.text()) || `HTTP ${r.status}`);
  return r.json() as Promise<T>;
}

export const api = {
  // users
  listUsers: () => fetch('/api/users').then(j<UsersPayload>),
  addUser: (body: { username: string; group: string; note?: string }) =>
    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(j<User>),
  updateUser: (id: string, patch: Partial<User>) =>
    fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<User>),
  deleteUser: (id: string) =>
    fetch(`/api/users/${id}`, { method: 'DELETE' }).then(j<{ ok: boolean }>),
  addGroup: (name: string) =>
    fetch('/api/users/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(j<string[]>),
  deleteGroup: (name: string) =>
    fetch(`/api/users/groups/${encodeURIComponent(name)}`, { method: 'DELETE' }).then(
      j<{ ok: boolean }>,
    ),

  // config
  getConfig: () => fetch('/api/config').then(j<Config>),
  patchConfig: (patch: Partial<Config>) =>
    fetch('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<Config>),
  saveCookies: (text: string) =>
    fetch('/api/config/cookies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(j<{ ok: boolean; bytes: number }>),
  getVersion: () => fetch('/api/config/version').then(j<{ version: string; code: number }>),
  testCookies: (target = 'instagram') =>
    fetch(`/api/config/test-cookies?target=${encodeURIComponent(target)}`, {
      method: 'POST',
    }).then(j<{ ok: boolean; code: number; stdout: string; stderr: string }>),

  // archive
  archiveStats: () =>
    fetch('/api/archive/stats').then(
      j<{ total: number; by_extractor: Record<string, number>; error?: string }>,
    ),

  // system
  shutdown: () => fetch('/api/system/shutdown', { method: 'POST' }).then(j<{ ok: boolean }>),
  browserStatus: (name: string) =>
    fetch(`/api/system/browser-status?name=${encodeURIComponent(name)}`).then(
      j<{ ok: boolean; unknown?: boolean; running: boolean; cookies_exists: boolean }>,
    ),
  recentEvents: () =>
    fetch('/api/system/recent-events').then(j<{ events: WsEvent[] }>),
};

// ---- WebSocket helper ----

export type WsEvent =
  | { type: 'meta'; total: number; targets: string[] }
  | { type: 'user_start'; index: number; total: number; user: string }
  | { type: 'started'; text: string; user?: string }
  | { type: 'log'; text: string; user?: string }
  | { type: 'file'; text: string; file_path?: string; user?: string }
  | { type: 'skip'; text: string; file_path?: string; user?: string }
  | { type: 'warning'; text: string; user?: string }
  | { type: 'error'; text: string; user?: string }
  | { type: 'done'; text: string; code: number; user?: string }
  | { type: 'circuit_breaker'; text: string; killed: number }
  | { type: 'all_done'; text: string };

export type DownloadRequest = {
  mode: 'all' | 'group' | 'selected' | 'adhoc';
  users?: string[];
  group?: string;
  urls?: string[];
};

export function openDownloadWs(
  req: DownloadRequest,
  onEvent: (e: WsEvent) => void,
  onClose?: () => void,
): WebSocket {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws/download`);
  ws.onopen = () => ws.send(JSON.stringify(req));
  ws.onmessage = (m) => {
    try {
      onEvent(JSON.parse(m.data));
    } catch {
      // ignore
    }
  };
  ws.onclose = () => onClose?.();
  return ws;
}
