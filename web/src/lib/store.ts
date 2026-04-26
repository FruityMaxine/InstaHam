import { create } from 'zustand';
import type { User, WsEvent } from './api';
import { detectInitialLocale, persistLocale, tr, type Locale } from './i18n';

export type Mode = 'all' | 'group' | 'selected' | 'adhoc';

export type LogLine = {
  id: number;
  type: WsEvent['type'];
  text: string;
  user?: string;
  ts: number;
};

type State = {
  users: User[];
  groups: string[];
  selectedUserIds: Set<string>;
  activeGroup: string;
  search: string;
  mode: Mode;

  // 实时下载状态
  ws: WebSocket | null;
  running: boolean;
  totalUsers: number;
  currentUserIndex: number; // 1-based
  currentUser: string | null;
  currentUserFiles: number;
  currentUserSkips: number;
  logs: LogLine[];
  logPaused: boolean;
  drawerOpen: boolean;
  archiveOpen: boolean;

  // 顶部
  archiveTotal: number;
  galleryDlVersion: string;
  connected: boolean;

  // i18n
  locale: Locale;

  // actions
  setUsers: (u: User[], g?: string[]) => void;
  toggleSelected: (id: string) => void;
  selectAllVisible: (ids: string[]) => void;
  clearSelection: () => void;
  setMode: (m: Mode) => void;
  setActiveGroup: (g: string) => void;
  setSearch: (s: string) => void;
  setDrawerOpen: (b: boolean) => void;
  setArchiveOpen: (b: boolean) => void;
  setConnected: (b: boolean) => void;
  setVersion: (v: string) => void;
  setArchiveTotal: (n: number) => void;
  setLocale: (l: Locale) => void;
  startRun: (ws: WebSocket) => void;
  finishRun: () => void;
  pushEvent: (e: WsEvent) => void;
  clearLogs: () => void;
  togglePause: () => void;
  hydrateLogs: (events: WsEvent[]) => void;
};

let logSeq = 0;
const MAX_LOG = 5000;

export const useStore = create<State>((set, get) => ({
  users: [],
  groups: ['默认'],
  selectedUserIds: new Set(),
  activeGroup: 'all',
  search: '',
  mode: 'all',

  ws: null,
  running: false,
  totalUsers: 0,
  currentUserIndex: 0,
  currentUser: null,
  currentUserFiles: 0,
  currentUserSkips: 0,
  logs: [],
  logPaused: false,
  drawerOpen: false,
  archiveOpen: false,

  archiveTotal: 0,
  galleryDlVersion: '',
  connected: false,

  locale: detectInitialLocale(),

  setUsers: (u, g) => set({ users: u, groups: g ?? get().groups }),
  toggleSelected: (id) => {
    const next = new Set(get().selectedUserIds);
    next.has(id) ? next.delete(id) : next.add(id);
    set({ selectedUserIds: next });
  },
  selectAllVisible: (ids) => {
    const next = new Set(get().selectedUserIds);
    const allIn = ids.every((i) => next.has(i));
    if (allIn) ids.forEach((i) => next.delete(i));
    else ids.forEach((i) => next.add(i));
    set({ selectedUserIds: next });
  },
  clearSelection: () => set({ selectedUserIds: new Set() }),
  setMode: (m) => set({ mode: m }),
  setActiveGroup: (g) => set({ activeGroup: g }),
  setSearch: (s) => set({ search: s }),
  setDrawerOpen: (b) => set({ drawerOpen: b }),
  setArchiveOpen: (b) => set({ archiveOpen: b }),
  setConnected: (b) => set({ connected: b }),
  setVersion: (v) => set({ galleryDlVersion: v }),
  setArchiveTotal: (n) => set({ archiveTotal: n }),
  setLocale: (l) => {
    persistLocale(l);
    set({ locale: l });
  },

  startRun: (ws) =>
    set({
      ws,
      running: true,
      totalUsers: 0,
      currentUserIndex: 0,
      currentUser: null,
      currentUserFiles: 0,
      currentUserSkips: 0,
      logs: [],
    }),
  finishRun: () => set({ running: false, ws: null }),
  togglePause: () => set({ logPaused: !get().logPaused }),
  clearLogs: () => set({ logs: [] }),

  hydrateLogs: (events) => {
    // 用 server 缓存的 events 重建 logs（用于关浏览器后重新打开恢复进度）
    const out: LogLine[] = [];
    for (const e of events) {
      let text: string;
      if (e.type === 'meta') {
        text = tr(get().locale, 'log.meta', { n: e.total, targets: e.targets.join(', ') });
      } else if (e.type === 'user_start') {
        text = tr(get().locale, 'log.userStart', { i: e.index, n: e.total, user: e.user });
      } else if ('text' in e) {
        text = e.text;
      } else {
        text = JSON.stringify(e);
      }
      out.push({
        id: ++logSeq,
        type: e.type,
        text,
        user: 'user' in e ? e.user : undefined,
        ts: Date.now(),
      });
    }
    set({ logs: out });
  },

  pushEvent: (e) => {
    const s = get();
    if (e.type === 'meta') {
      set({ totalUsers: e.total });
      // 也作为一条日志保留，便于排错
      if (!s.logPaused) {
        const line: LogLine = {
          id: ++logSeq,
          type: 'meta',
          text: tr(s.locale, 'log.meta', { n: e.total, targets: e.targets.join(', ') }),
          ts: Date.now(),
        };
        set({ logs: [...s.logs, line] });
      }
      return;
    }
    if (e.type === 'user_start') {
      set({
        currentUserIndex: e.index,
        currentUser: e.user,
        currentUserFiles: 0,
        currentUserSkips: 0,
      });
    }
    if (e.type === 'file') {
      set({ currentUserFiles: s.currentUserFiles + 1 });
    }
    if (e.type === 'skip') {
      set({ currentUserSkips: s.currentUserSkips + 1 });
    }
    if (e.type === 'all_done') {
      set({ running: false });
    }
    if (s.logPaused) return;
    let text: string;
    if (e.type === 'user_start') {
      text = tr(s.locale, 'log.userStart', { i: e.index, n: e.total, user: e.user });
    } else {
      text = 'text' in e ? e.text : JSON.stringify(e);
    }
    const line: LogLine = {
      id: ++logSeq,
      type: e.type,
      text,
      user: 'user' in e ? e.user : undefined,
      ts: Date.now(),
    };
    const logs = s.logs.length >= MAX_LOG ? s.logs.slice(-MAX_LOG + 1) : s.logs;
    set({ logs: [...logs, line] });
  },
}));
