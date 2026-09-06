import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const staticPages = [
    { url: '/ar', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/en', priority: 1.0, changeFrequency: 'daily' as const },
    { url: '/ar/shop', priority: 0.9, changeFrequency: 'daily' as const },
    { url: '/en/shop', priority: 0.9, changeFrequency: 'daily' as const },
    { url: '/ar/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/en/login', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/ar/register', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/en/register', priority: 0.5, changeFrequency: 'monthly' as const },
    { url: '/ar/track-order', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/en/track-order', priority: 0.6, changeFrequency: 'monthly' as const },
    { url: '/ar/search', priority: 0.7, changeFrequency: 'weekly' as const },
    { url: '/en/search', priority: 0.7, changeFrequency: 'weekly' as const },
  ];

  return staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}
