// Shared by the account page and its session-recovery form. No identity is inferred here.
export function safeReturnPath(value, fallback = '/') {
  if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://app.local');
    const decoded = decodeURIComponent(url.pathname);
    if (url.origin !== 'https://app.local' || /[\\\u0000-\u0020\u007f%]/.test(decoded) || decoded.startsWith('//')) return fallback;
    if (/^\/(?:signin-with-chatgpt|signout-with-chatgpt|callback|account|api)(?:\/|$)/i.test(decoded)) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}
export function accountNavigation(language, requested) {
  const lang = ['zh', 'en', 'it'].includes(language) ? language : 'zh';
  const destination = safeReturnPath(requested, `/${lang}/#private-tasks`);
  const accountPath = `/account?lang=${lang}&return_to=${encodeURIComponent(destination)}`;
  return {destination, accountPath, signInPath: `/signin-with-chatgpt?return_to=${encodeURIComponent(accountPath)}`};
}
