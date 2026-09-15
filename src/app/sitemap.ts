import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const STATIC_PAGES = [
  { url: '/ar', priority: 1.0, changeFrequency: 'daily' as const },
  { url: '/en', priority: 1.0, changeFrequency: 'daily' as const },
  { url: '/ar/shop', priority: 0.9, changeFrequency: 'daily' as const },
  { url: '/en/shop', priority: 0.9, changeFrequency: 'daily' as const },
  { url: '/ar/track-order', priority: 0.6, changeFrequency: 'monthly' as const },
  { url: '/en/track-order', priority: 0.6, changeFrequency: 'monthly' as const },
  { url: '/ar/shipping', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/en/shipping', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/ar/returns', priority: 0.5, changeFrequency: 'monthly' as const },
  { url: '/en/returns', priority: 0.5, changeFrequency: 'monthly' as const },
];

function getBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured && !configured.includes('localhost')) return configured;

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/\/$/, '');
  if (productionDomain) {
    return /^https?:\/\//i.test(productionDomain)
      ? productionDomain
      : `https://${productionDomain}`;
  }

  return configured || 'http://localhost:3000';
}

function toEntries(baseUrl: string, pages: Array<{ url: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; lastModified?: Date }>): MetadataRoute.Sitemap {
  return pages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: page.lastModified ?? new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl();
  const staticEntries = toEntries(baseUrl, STATIC_PAGES);

  try {
    const [categories, products] = await Promise.all([
      db.category.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      db.product.findMany({
        where: { isActive: true, isDeleted: false },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const categoryEntries = categories.flatMap((category) => ([
      {
        url: `/ar/category/${category.slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: category.updatedAt,
      },
      {
        url: `/en/category/${category.slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: category.updatedAt,
      },
    ]));

    const productEntries = products.flatMap((product) => ([
      {
        url: `/ar/product/${product.slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: product.updatedAt,
      },
      {
        url: `/en/product/${product.slug}`,
        priority: 0.8,
        changeFrequency: 'weekly' as const,
        lastModified: product.updatedAt,
      },
    ]));

    return [...staticEntries, ...toEntries(baseUrl, categoryEntries), ...toEntries(baseUrl, productEntries)];
  } catch {
    return staticEntries;
  }
}
