// 通过 navigator.userAgent 推断当前 InstaHam UI 在哪个浏览器里跑。
// 用于警告用户「你想从这个浏览器读 cookies，但它就是当前 UI 浏览器」。
//
// 注意 Brave 默认 UA 跟 Chrome 一样，无法可靠区分；返回 'chrome'。
// 这是浏览器自身限制，不是 bug。

export type DetectedBrowser =
  | 'edge'
  | 'firefox'
  | 'opera'
  | 'vivaldi'
  | 'chrome'
  | 'unknown';

export function detectCurrentBrowser(): DetectedBrowser {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  // 顺序很重要：Edge / Vivaldi / Opera 的 UA 里都含 chrome，所以先判它们
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('firefox/')) return 'firefox';
  if (ua.includes('opr/') || ua.includes('opera/')) return 'opera';
  if (ua.includes('vivaldi/')) return 'vivaldi';
  if (ua.includes('chrome/')) return 'chrome';
  return 'unknown';
}
