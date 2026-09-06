import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { ProductForm, type ProductFormInitialData } from '@/components/admin/ProductForm';

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

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const [categories, product] = await Promise.all([
    getFlatCategories(),
    db.product.findUnique({
      where: { id },
      include: {
        translations: true,
        images: { orderBy: { order: 'asc' } },
        variants: true,
        tags: true,
      },
    }),
  ]);

  if (!product) notFound();

  const initial: ProductFormInitialData = {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    categoryId: product.categoryId,
    price: String(product.price),
    comparePrice: product.comparePrice ? String(product.comparePrice) : '',
    costPrice: product.costPrice ? String(product.costPrice) : '',
    hasVariants: product.hasVariants,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    nameAr: product.translations.find((t) => t.locale === 'ar')?.name || '',
    nameEn: product.translations.find((t) => t.locale === 'en')?.name || '',
    shortDescriptionAr:
      product.translations.find((t) => t.locale === 'ar')?.shortDescription || '',
    shortDescriptionEn:
      product.translations.find((t) => t.locale === 'en')?.shortDescription || '',
    descriptionAr:
      product.translations.find((t) => t.locale === 'ar')?.description || '',
    descriptionEn:
      product.translations.find((t) => t.locale === 'en')?.description || '',
    tagsAr: product.tags.filter((t) => t.locale === 'ar').map((t) => t.tag),
    tagsEn: product.tags.filter((t) => t.locale === 'en').map((t) => t.tag),
    variants: product.variants.map((v) => ({
      id: v.id,
      size: v.size || '',
      color: v.color || '',
      colorHex: v.colorHex || '',
      stock: String(v.stock),
      sku: v.sku || '',
      priceAdjustment: v.priceAdjustment ? String(v.priceAdjustment) : '',
    })),
    images: product.images.map((img) => ({
      id: img.id,
      base64Data: img.base64Data,
      mimeType: img.mimeType,
      fileSize: img.fileSize,
      isPrimary: img.isPrimary,
    })),
  };

  return <ProductForm locale={locale} categories={categories} product={initial} />;
}
