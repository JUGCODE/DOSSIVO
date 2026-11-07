'use client';
import {UINav,LocaleLink,UIText} from '@/app/ui-language';
import { useEffect, useState, type MouseEvent } from 'react';

export default function ProtocolNavigation() {
  const [returnTo, setReturnTo] = useState('/');
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

  return <UINav className="protocol-toolbar" aria-label="协议 导航">
    <div className="protocol-toolbar-inner">
      <LocaleLink className="protocol-back" href={returnTo} onClick={returnToDossivo}><UIText>{"← 返回 / Back"}</UIText></LocaleLink>
      <span className="protocol-toolbar-title"><UIText>{"DOSSIVO · PROTOCOL"}</UIText></span>
      <LocaleLink className="protocol-close" href={returnTo} onClick={returnToDossivo} aria-label="关闭 协议 并返回 / Close 协议" title="关闭并返回 / Close and return">×</LocaleLink>
    </div>
  </UINav>;
}
