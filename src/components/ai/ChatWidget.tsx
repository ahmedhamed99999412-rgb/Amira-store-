'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCartStore } from '@/store/cart-store';

type Message = { role: 'user' | 'assistant'; content: string };

export function ChatWidget({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const t = useTranslations('ai');
  const cartOpen = useCartStore((s) => s.isOpen);

  useEffect(() => {
    if (open && messages.length === 0) {
      const timeoutId = window.setTimeout(() => {
        setMessages([{ role: 'assistant', content: t('chatGreeting') }]);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Hide on admin/auth/checkout pages OR when cart drawer is open
  if (pathname.includes('/admin') || pathname.includes('/login') || pathname.includes('/register') || pathname.includes('/checkout') || cartOpen) {
    return null;
  }

  async function send() {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages((p) => [...p, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: messages.map((m) => ({ role: m.role, content: m.content })) }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setMessages((p) => [...p, { role: 'assistant', content: data.response }]);
      } else {
        setMessages((p) => [...p, { role: 'assistant', content: locale === 'ar' ? 'عذراً، حدث خطأ.' : 'Sorry, an error occurred.' }]);
      }
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: locale === 'ar' ? 'خطأ في الاتصال.' : 'Connection error.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(!open)} className="fixed bottom-6 end-6 z-30 w-14 h-14 rounded-full bg-brand-charcoal hover:bg-brand-charcoal/90 text-white shadow-xl flex items-center justify-center transition-transform hover:scale-110 ring-4 ring-white/50" aria-label={t('chatTitle')}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 end-6 z-30 w-[calc(100vw-3rem)] sm:w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden">
          <div className="bg-brand-charcoal text-white p-4 flex items-center justify-between">
            <div>
              <h3 className="font-medium">{t('chatTitle')}</h3>
              <p className="text-xs text-white/60">{locale === 'ar' ? 'أميرا ستور - مساعد ذكي' : 'Amira Store - AI Assistant'}</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded"><X className="h-4 w-4" /></button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-brand-mauve text-white rounded-br-none' : 'bg-white border border-border rounded-bl-none'}`}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border p-3 rounded-lg rounded-bl-none"><Loader2 className="h-4 w-4 animate-spin" /></div>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder={t('chatPlaceholder')} disabled={loading} className="h-10" />
            <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="bg-brand-charcoal hover:bg-brand-charcoal/90 h-10 w-10 shrink-0"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </>
  );
}
