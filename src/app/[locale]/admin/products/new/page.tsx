import { setRequestLocale } from 'next-intl/server';
import { db } from '@/lib/db';
import { ProductForm } from '@/components/admin/ProductForm';

export const dynamic = 'force-dynamic';

type FlatCategory = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  depth: number;
};

async function getFlatCategories(): Promise<FlatCategory[]> {
  const roots = await db.category.findMany({
    where: { parentId: null },
    orderBy: { order: 'asc' },
    include: {
      translations: true,
      children: {
        include: {
          translations: true,
          children: { include: { translations: true }, orderBy: { order: 'asc' } },
        },
        orderBy: { order: 'asc' },
      },
    },
  });

  const out: FlatCategory[] = [];
  function walk(cats: any[], depth: number) {
    for (const c of cats) {
      out.push({
        id: c.id,
        slug: c.slug,
        nameAr: c.translations.find((t: any) => t.locale === 'ar')?.name || c.slug,
        nameEn: c.translations.find((t: any) => t.locale === 'en')?.name || c.slug,
        depth,
      });
      if (c.children?.length) walk(c.children, depth + 1);
    }
  }
  walk(roots, 0);
  return out;
}

export default async function AdminNewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const categories = await getFlatCategories();
  return <ProductForm locale={locale} categories={categories} />;
}
