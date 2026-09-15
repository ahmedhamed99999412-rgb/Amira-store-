'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

const DeferredServerStateSync = dynamic(
  () => import('@/components/store/ServerStateSync').then((m) => m.ServerStateSync),
  { ssr: false }
);

const DeferredCartDrawer = dynamic(
  () => import('@/components/cart/CartDrawer').then((m) => m.CartDrawer),
  { ssr: false }
);

const DeferredChatWidget = dynamic(
  () => import('@/components/ai/ChatWidget').then((m) => m.ChatWidget),
  { ssr: false }
);

function runWhenIdle(callback: () => void) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }

  const id = window.setTimeout(callback, 1000);
  return () => window.clearTimeout(id);
}

export function DeferredStoreRuntime({ locale }: { locale: string }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return runWhenIdle(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <>
      <DeferredServerStateSync locale={locale} />
      <DeferredCartDrawer locale={locale} />
      <DeferredChatWidget locale={locale} />
    </>
  );
}
