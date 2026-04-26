// 轻量 i18n。只两种语言，不引入外部库。
// 用法：const t = useT(); t('topbar.archived'); t('log.target', { i: 1, n: 5, user: 'foo' });

import { useStore } from './store';

export type Locale = 'zh' | 'en';

type Dict = Record<string, string>;

const zh: Dict = {
  // TopBar
  'topbar.subtitle': 'gallery-dl 控制台',
  'topbar.connection': '连接',
  'topbar.live': 'live',
  'topbar.offline': 'offline',
  'topbar.archived': '已归档',
  'topbar.settings': '设置',
  'topbar.exit': '退出',
  'topbar.exit.title': '退出应用（终止后端进程）',
  'topbar.exit.confirm': '退出 InstaHam？后端进程将完全终止。',
  'topbar.exit.bye': 'InstaHam 已退出',
  'topbar.exit.byeHint': '可以关闭此标签页。',
  'topbar.langTitle': '切换语言 / Switch language',

  // Sidebar
  'sidebar.title': '用户列表',
  'sidebar.add': '新增',
  'sidebar.search': '搜索 用户名 / 备注',
  'sidebar.all': '全部',
  'sidebar.addPlaceholder': 'Instagram 用户名（不带 @）',
  'sidebar.confirm': '添加',
  'sidebar.addFail': '添加失败：{msg}',
  'sidebar.selectVisible': '勾选当前 ({n})',
  'sidebar.clearSel': '清空选择 ({n})',
  'sidebar.empty1': '暂无匹配用户。',
  'sidebar.empty2': '点右上「新增」添加。',

  // Groups
  'group.default': '默认',
  'group.addTitle': '新建分组',
  'group.addPlaceholder': '分组名',
  'group.deleteTitle': '删除该分组',
  'group.deleteConfirm': '删除分组「{name}」？该分组下的用户会回到默认分组。',
  'group.deleteFail': '删除失败：{msg}',
  'group.addFail': '新建失败：{msg}',

  // UserRow
  'user.never': '从未下载',
  'user.deleteConfirm': '删除 @{name}？',
  'user.saveFail': '保存失败：{msg}',

  // TaskPanel
  'mode.all': '全量',
  'mode.group': '分组',
  'mode.selected': '勾选',
  'mode.adhoc': '临时',
  'mode.adhocPlaceholder': '粘贴 IG 链接 / 用户名（空格或换行分隔，不入列表）',
  'task.targets': '目标 {n}',
  'task.start': '开始下载',
  'task.stop': '停止',

  // ProgressBars
  'progress.total': '总进度',
  'progress.current': '当前用户',
  'progress.idle': '空闲',
  'progress.fileSkip': '@{user}  · {files} 新文件  · {skips} 跳过',

  // LogStream
  'log.title': '实时日志',
  'log.streaming': 'streaming',
  'log.pause': '暂停',
  'log.resume': '继续',
  'log.copy': '复制',
  'log.clear': '清空',
  'log.idle1': '日志面板空闲中。',
  'log.idle2': '点击右上「开始下载」启动任务。',
  'log.meta': '共 {n} 个目标：{targets}',
  'log.userStart': '▸ 第 {i}/{n} 个目标：@{user}',

  // ConfigDrawer
  'cfg.title': '设置',
  'cfg.subtitle': 'cookies · 下载目录 · 视频质量',
  'cfg.cookies': 'Cookies (Netscape 格式)',
  'cfg.cookiesPlaceholder':
    '# Netscape HTTP Cookie File\n.instagram.com  TRUE  /  TRUE  ...  sessionid  ...',
  'cfg.cookiesHint': '推荐用 Chrome 扩展「Get cookies.txt LOCALLY」导出。',
  'cfg.dir': '下载目录',
  'cfg.concurrency': '并发数',
  'cfg.videoMode': '视频模式',
  'cfg.videoTrue': 'true · DASH 最高质量（需 ffmpeg）',
  'cfg.videoMerged': 'merged · 预合并（无 ffmpeg）',
  'cfg.videoFalse': 'false · 跳过视频',
  'cfg.ffmpegPath': 'ffmpeg 路径',
  'cfg.include': '抓取项 (instagram.include)',
  'cfg.test': '测试 cookies',
  'cfg.save': '保存',
  'cfg.saveOk': '已保存 · cookies {bytes} 字节 · 配置已更新',
  'cfg.saveFail': '保存失败：{msg}',
};

const en: Dict = {
  // TopBar
  'topbar.subtitle': 'gallery-dl console',
  'topbar.connection': 'Connection',
  'topbar.live': 'live',
  'topbar.offline': 'offline',
  'topbar.archived': 'Archived',
  'topbar.settings': 'Settings',
  'topbar.exit': 'Exit',
  'topbar.exit.title': 'Exit app (terminates backend process)',
  'topbar.exit.confirm': 'Exit InstaHam? The backend process will be terminated.',
  'topbar.exit.bye': 'InstaHam has exited',
  'topbar.exit.byeHint': 'You can close this tab.',
  'topbar.langTitle': 'Switch language / 切换语言',

  // Sidebar
  'sidebar.title': 'Users',
  'sidebar.add': 'Add',
  'sidebar.search': 'Search username / note',
  'sidebar.all': 'All',
  'sidebar.addPlaceholder': 'Instagram username (no @)',
  'sidebar.confirm': 'Add',
  'sidebar.addFail': 'Failed to add: {msg}',
  'sidebar.selectVisible': 'Select visible ({n})',
  'sidebar.clearSel': 'Clear ({n})',
  'sidebar.empty1': 'No matching users.',
  'sidebar.empty2': 'Click "Add" in the top-right to add one.',

  // Groups
  'group.default': 'Default',
  'group.addTitle': 'New group',
  'group.addPlaceholder': 'Group name',
  'group.deleteTitle': 'Delete this group',
  'group.deleteConfirm': 'Delete group "{name}"? Users in it will move to the default group.',
  'group.deleteFail': 'Delete failed: {msg}',
  'group.addFail': 'Add failed: {msg}',

  // UserRow
  'user.never': 'Never downloaded',
  'user.deleteConfirm': 'Delete @{name}?',
  'user.saveFail': 'Save failed: {msg}',

  // TaskPanel
  'mode.all': 'All',
  'mode.group': 'Group',
  'mode.selected': 'Selected',
  'mode.adhoc': 'Ad-hoc',
  'mode.adhocPlaceholder': 'Paste IG URL / username (space or newline separated, not added to list)',
  'task.targets': '{n} targets',
  'task.start': 'Start',
  'task.stop': 'Stop',

  // ProgressBars
  'progress.total': 'Overall',
  'progress.current': 'Current',
  'progress.idle': 'Idle',
  'progress.fileSkip': '@{user}  · {files} new  · {skips} skipped',

  // LogStream
  'log.title': 'Live log',
  'log.streaming': 'streaming',
  'log.pause': 'Pause',
  'log.resume': 'Resume',
  'log.copy': 'Copy',
  'log.clear': 'Clear',
  'log.idle1': 'Log idle.',
  'log.idle2': 'Click "Start" in the top-right to begin.',
  'log.meta': '{n} targets total: {targets}',
  'log.userStart': '▸ Target {i}/{n}: @{user}',

  // ConfigDrawer
  'cfg.title': 'Settings',
  'cfg.subtitle': 'cookies · download dir · video quality',
  'cfg.cookies': 'Cookies (Netscape format)',
  'cfg.cookiesPlaceholder':
    '# Netscape HTTP Cookie File\n.instagram.com  TRUE  /  TRUE  ...  sessionid  ...',
  'cfg.cookiesHint': 'Use the Chrome extension "Get cookies.txt LOCALLY" to export.',
  'cfg.dir': 'Download Folder',
  'cfg.concurrency': 'Concurrency',
  'cfg.videoMode': 'Video Mode',
  'cfg.videoTrue': 'true · DASH max quality (needs ffmpeg)',
  'cfg.videoMerged': 'merged · pre-merged (no ffmpeg)',
  'cfg.videoFalse': 'false · skip videos',
  'cfg.ffmpegPath': 'ffmpeg path',
  'cfg.include': 'Include (instagram.include)',
  'cfg.test': 'Test cookies',
  'cfg.save': 'Save',
  'cfg.saveOk': 'Saved · cookies {bytes} bytes · config updated',
  'cfg.saveFail': 'Save failed: {msg}',
};

const dicts: Record<Locale, Dict> = { zh, en };

export function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const saved = window.localStorage.getItem('instaham.locale') as Locale | null;
  if (saved === 'zh' || saved === 'en') return saved;
  // 第一次访问无缓存 → 默认英文（用户手动切换后会写入 localStorage 持久化）
  return 'en';
}

/** 内部存储用 "默认" 作为分组标识；UI 渲染时按 locale 翻译 */
export function displayGroupName(name: string, locale: Locale): string {
  if (name === '默认') return locale === 'zh' ? '默认' : 'Default';
  return name;
}

export function persistLocale(l: Locale): void {
  try {
    window.localStorage.setItem('instaham.locale', l);
  } catch {
    /* ignore */
  }
}

/** 同步翻译函数 (locale 可选，默认从 store 读) — 给非 React 上下文用 */
export function tr(locale: Locale, key: string, params?: Record<string, string | number>): string {
  let text = dicts[locale][key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** React hook：返回 t 函数，会随 locale 变化重渲 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const locale = useStore((s) => s.locale);
  return (key, params) => tr(locale, key, params);
}
