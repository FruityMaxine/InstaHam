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
  'sidebar.addEmpty': '在搜索框输入用户名，再点「新增」',
  'sidebar.addTo': '添加 @{name} → {group}',
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
  'task.alreadyRunning': '下载正在进行中，请等待完成或点击停止',

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
  'cfg.cookieSource': 'Cookies 来源',
  'cfg.cookieSrcManual': '手动粘贴',
  'cfg.cookieSrcBrowser': '从浏览器读取',
  'cfg.browser': '浏览器',
  'cfg.browserHint': '抓取时实时从所选浏览器读取 cookies。Chrome / Edge 必须先关闭浏览器；Firefox 无此限制。浏览器只要日常登着 Instagram，sessionid 就会被 IG 服务端自动续期，永不过期。',
  'cfg.parallel': '并发下载',
  'cfg.parallelEnable': '启用实验性并发',
  'cfg.parallelWorkers': '工作线程数',
  'cfg.parallelSleep': '单请求 sleep（秒）',
  'cfg.parallelJitter': '自动抖动 (±30%)',
  'cfg.parallelBreaker': '风险熔断',
  'cfg.parallelBreakerHint': '检测到 429 / login required / challenge 任一 worker 报错时，立即终止所有正在跑的子进程',
  'cfg.parallelWarn': '⚠ 并发可能触发 Instagram 风控（弹验证码 / 临时封号）。建议 sleep ≥ 工作线程数 × 1.0 秒。',
  'cfg.groupByType': '按类型分目录',
  'cfg.groupByTypeHint': '开启后下载到 instagram/<用户名>/posts/、stories/、reels/... 子目录，便于按类型查看；关闭则全部平铺在 instagram/<用户名>/ 下',
  'cfg.includeHint': '⚠ tagged 会下载别人 @ 你目标用户的帖子，并按发帖人创建独立用户名文件夹（不在你目标用户的文件夹内）。如只要原创内容，请保持 tagged 关闭。',
  'cfg.autoSync': '下载前自动对齐 archive',
  'cfg.autoSyncHint': '点 Start 时先扫磁盘，删除 archive 里"磁盘已删但 archive 还记着"的孤儿条目，让被你手动删过的文件能重新被下回来',
  'cfg.backfill': '启动时补齐用户列表',
  'cfg.backfillHint': '启动时扫描下载目录，把磁盘上有文件夹但用户列表里缺失的用户自动添加到列表（分组为"默认"）',
  'arch.title': 'Archive 管理',
  'arch.subtitle': '已下载条目总览 + 按用户管理',
  'arch.total': '总条目',
  'arch.orphans': '孤儿（archive 有 / 磁盘没）',
  'arch.userCount': '{n} 个用户',
  'arch.syncNow': '立即对齐',
  'arch.syncDone': '已清理 {n} 条孤儿',
  'arch.syncNothing': 'archive 与磁盘已对齐，无孤儿',
  'arch.deleteUser': '从 archive 移除',
  'arch.deleteUserConfirm': '从 archive 删除 @{name} 的所有条目？\n\n这不会删磁盘文件。下次跑下载时会重新拉这个用户的所有内容。',
  'arch.deleteAll': '清空全部',
  'arch.deleteAllConfirm': '⚠ 清空整个 archive？\n\n这不会删磁盘文件，但下次跑下载会全量重新拉所有用户的所有内容（耗时长、有触发 IG 风控的风险）。',
  'arch.deleted': '已从 archive 删除 {n} 条',
  'arch.colUsername': '用户',
  'arch.colOnDisk': '磁盘文件',
  'arch.colInArchive': 'Archive',
  'arch.empty': '暂无下载条目',
  'arch.refresh': '刷新',
  'topbar.archive': '档案',
  'skip.archive': 'archive 命中',
  'skip.disk': '磁盘已存在',
  'skip.unknown': '未知',

  // BrowserCookieGate
  'gate.title.notLogged': '尚未登录',
  'gate.body.notLogged': '在 {browser} 中找不到 Instagram cookies。请先打开 {browser} → 访问 instagram.com → 登录账号 → 然后回到这里点 "开始下载"。',
  'gate.title.running': '请先关闭 {browser}',
  'gate.body.running': '{browser} 当前正在运行，cookies 文件被独占锁定。完全关闭 {browser}（包括所有标签页和后台）后，点 "重试"。',
  'gate.title.self': '需要关闭当前浏览器',
  'gate.body.self': '你选的 cookies 来源 {browser} 也是当前 InstaHam UI 所在的浏览器。\n\n下载即将启动，然后请你执行：\n1. 完全关闭整个 {browser}（包括所有标签页和后台进程）\n2. 等几秒，下载会在后台继续\n3. 任何时候重新打开浏览器访问 http://127.0.0.1:8765\n\n之前的日志会自动恢复。',
  'gate.cancel': '取消',
  'gate.retry': '我已关闭，重试',
  'gate.confirmSelf': '我会手动关闭浏览器',
  'gate.checking': '检测中…',
  'gate.startedHint': '下载已启动！现在请手动关闭整个浏览器，下载会在后台继续。完成后重新打开 http://127.0.0.1:8765 查看结果。',
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
  'sidebar.addEmpty': 'Type a username in the search box, then click "Add"',
  'sidebar.addTo': 'Add @{name} → {group}',
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
  'task.alreadyRunning': 'A download is already running. Wait or click Stop.',

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
  'cfg.cookieSource': 'Cookies source',
  'cfg.cookieSrcManual': 'Paste manually',
  'cfg.cookieSrcBrowser': 'Read from browser',
  'cfg.browser': 'Browser',
  'cfg.browserHint': 'Cookies are read live from the selected browser at download time. Chrome / Edge must be fully closed; Firefox has no such restriction. As long as you keep the browser logged into Instagram, the sessionid auto-renews server-side and never expires.',
  'cfg.parallel': 'Parallel downloads',
  'cfg.parallelEnable': 'Enable experimental parallelism',
  'cfg.parallelWorkers': 'Worker threads',
  'cfg.parallelSleep': 'Sleep per request (s)',
  'cfg.parallelJitter': 'Auto jitter (±30%)',
  'cfg.parallelBreaker': 'Circuit breaker',
  'cfg.parallelBreakerHint': 'When any worker hits 429 / login required / challenge, all running subprocesses are terminated immediately',
  'cfg.parallelWarn': '⚠ Parallelism may trigger Instagram rate-limiting (captcha / temporary suspension). Recommend sleep ≥ workers × 1.0 s.',
  'cfg.groupByType': 'Group by type',
  'cfg.groupByTypeHint': 'Save into instagram/<username>/posts/, stories/, reels/... sub-folders so each content type stays separate. Disable to flatten everything under instagram/<username>/.',
  'cfg.includeHint': '⚠ "tagged" downloads posts where others @ your target user — and saves them into the original poster\'s own folder (NOT inside your target\'s folder). Keep "tagged" off if you only want the target\'s own content.',
  'cfg.autoSync': 'Auto-sync archive before download',
  'cfg.autoSyncHint': 'On Start, first scan the disk and remove "ghost" entries from the archive that point to files you have deleted manually — so they can be re-downloaded',
  'cfg.backfill': 'Backfill user list on start',
  'cfg.backfillHint': 'On startup, scan the download folder and auto-add users who have folders on disk but are missing from the user list (assigned to the default group)',
  'arch.title': 'Archive Manager',
  'arch.subtitle': 'Per-user view of downloaded entries',
  'arch.total': 'Total entries',
  'arch.orphans': 'Orphans (in archive / not on disk)',
  'arch.userCount': '{n} users',
  'arch.syncNow': 'Sync now',
  'arch.syncDone': 'Removed {n} orphan entries',
  'arch.syncNothing': 'Archive is already in sync with disk',
  'arch.deleteUser': 'Remove from archive',
  'arch.deleteUserConfirm': 'Delete all archive entries for @{name}?\n\nThis does NOT delete disk files. Next download will re-fetch everything for this user.',
  'arch.deleteAll': 'Clear all',
  'arch.deleteAllConfirm': '⚠ Wipe the entire archive?\n\nThis does NOT delete disk files, but the next download will re-fetch every user from scratch (long, may trigger Instagram rate-limit).',
  'arch.deleted': 'Deleted {n} entries from archive',
  'arch.colUsername': 'User',
  'arch.colOnDisk': 'On disk',
  'arch.colInArchive': 'Archive',
  'arch.empty': 'No download entries yet',
  'arch.refresh': 'Refresh',
  'topbar.archive': 'Archive',
  'skip.archive': 'archive hit',
  'skip.disk': 'file exists',
  'skip.unknown': 'unknown',

  // BrowserCookieGate
  'gate.title.notLogged': 'Not logged in yet',
  'gate.body.notLogged': 'No Instagram cookies found in {browser}. Open {browser} → visit instagram.com → log in → come back here and click "Start" again.',
  'gate.title.running': 'Close {browser} first',
  'gate.body.running': '{browser} is currently running and its cookies file is exclusively locked. Fully close {browser} (all tabs and background processes), then click "Retry".',
  'gate.title.self': 'Close this browser to proceed',
  'gate.body.self': 'The cookies source you picked ({browser}) is also the browser running this InstaHam UI.\n\nThe download will start now. Then:\n1. Fully close {browser} (every tab and background process)\n2. Wait a moment — the download keeps running in the background\n3. Reopen any browser to http://127.0.0.1:8765 whenever\n\nPrevious logs are auto-restored on reconnect.',
  'gate.cancel': 'Cancel',
  'gate.retry': "I closed it, retry",
  'gate.confirmSelf': "I'll close the browser manually",
  'gate.checking': 'Checking…',
  'gate.startedHint': 'Download started! Now manually close the browser. The download keeps running in the background. Reopen http://127.0.0.1:8765 anytime to see results.',
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
