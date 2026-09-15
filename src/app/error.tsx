'use client';

import arMessages from '../../messages/ar.json';
import enMessages from '../../messages/en.json';
import { usePathname } from 'next/navigation';

type ErrorMessages = {
  title: string;
  description: string;
  retry: string;
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  void error;

  const pathname = usePathname();
  const isEnglish = pathname.startsWith('/en');
  const messages = (isEnglish ? enMessages : arMessages).error as ErrorMessages;

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-medium text-brand-charcoal mb-2">
          {messages.title}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {messages.description}
        </p>
        <button
          onClick={reset}
          className="h-10 px-6 rounded-md text-sm font-medium transition-colors"
          style={{ backgroundColor: '#1A1A1A', color: '#FFFFFF' }}
        >
          {messages.retry}
        </button>
      </div>
    </div>
  );
}
