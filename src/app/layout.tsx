import type { ReactNode } from 'react';

// Root layout - minimal pass-through.
// All rendering logic lives in src/app/[locale]/layout.tsx
// This is required by Next.js App Router when using i18n with locale segments.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
