'use client';

import { useEffect, useState, type MouseEvent } from 'react';

export default function ProtocolNavigation() {
  const [returnTo, setReturnTo] = useState('/zh/');
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (!document.referrer) return;
    try {
      const previous = new URL(document.referrer);
      if (previous.origin !== window.location.origin || /^\/protocol\/?$/.test(previous.pathname)) return;
      setReturnTo(previous.pathname + previous.search + previous.hash);
      setCanGoBack(window.history.length > 1);
    } catch {
      // Direct visits keep a working DOSSIVO home link.
    }
  }, []);

  function returnToDossivo(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (canGoBack) {
      event.preventDefault();
      window.history.back();
    }
  }

  return <nav className="protocol-toolbar" aria-label="Protocol 导航">
    <div className="protocol-toolbar-inner">
      <a className="protocol-back" href={returnTo} onClick={returnToDossivo}>← 返回 / Back</a>
      <span className="protocol-toolbar-title">DOSSIVO · PROTOCOL</span>
      <a className="protocol-close" href={returnTo} onClick={returnToDossivo} aria-label="关闭 Protocol 并返回 / Close Protocol" title="关闭并返回 / Close and return">×</a>
    </div>
  </nav>;
}
