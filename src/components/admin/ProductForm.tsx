'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Save,
  Upload,
  X,
  Sparkles,
  Languages,
  Wand2,
  Copy,
  Package,
  Boxes,
  Tag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export type ProductFormInitialData = {
  id: string;
  slug: string;
  sku: string;
  categoryId: string;
  price: string;
  comparePrice: string;
  costPrice: string;
  hasVariants: boolean;
  isActive: boolean;
  isFeatured: boolean;
  nameAr: string;
  nameEn: string;
  shortDescriptionAr: string;
  shortDescriptionEn: string;
  descriptionAr: string;
  descriptionEn: string;
  tagsAr: string[];
  tagsEn: string[];
  variants: Array<{
    id?: string;
    size: string;
    color: string;
    colorHex: string;
    stock: string;
    sku: string;
    priceAdjustment: string;
  }>;
  images: Array<{
    id?: string;
    base64Data: string;
    mimeType: string;
    fileSize: number;
    isPrimary?: boolean;
  }>;
};

export type FlatCategory = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  depth: number;
};

type NewImage = { base64Data: string; mimeType: string; fileSize: number; preview: string };
type VariantMode = 'size' | 'color' | 'both';

function readFileAsBase64(file: File): Promise<{ base64Data: string; mimeType: string; fileSize: number; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({
        base64Data,
        mimeType: file.type,
        fileSize: file.size,
        preview: result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProductForm({
  product,
  categories,
  locale,
}: {
  product?: ProductFormInitialData;
  categories: FlatCategory[];
  locale: string;
}) {
  const t = useTranslations('admin');
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = !!product;

  const [form, setForm] = useState({
    // slug and sku are auto-generated, kept for edit mode reference but hidden from UI
    slug: product?.slug || '',
    sku: product?.sku || '',
    categoryId: product?.categoryId || '',
    price: product?.price || '',
    costPrice: product?.costPrice || '',
    hasVariants: product?.hasVariants ?? false,
    isActive: product?.isActive ?? true,
    isFeatured: product?.isFeatured ?? false,
    nameAr: product?.nameAr || '',
    nameEn: product?.nameEn || '',
    shortDescriptionAr: product?.shortDescriptionAr || '',
    shortDescriptionEn: product?.shortDescriptionEn || '',
  });
  const [regularPrice, setRegularPrice] = useState(
    product?.comparePrice || product?.price || ''
  );
  const [salePrice, setSalePrice] = useState(
    product?.comparePrice && Number(product.comparePrice) > Number(product.price)
      ? product.price
      : ''
  );

  const [variants, setVariants] = useState(
    product?.variants && product.variants.length > 0
      ? product.variants
      : [{ size: '', color: '', colorHex: '#000000', stock: '0', sku: '', priceAdjustment: '' }]
  );
  const [variantMode, setVariantMode] = useState<VariantMode>(() => {
    const initialVariants = product?.variants || [];
    const hasSize = initialVariants.some((variant) => variant.size.trim().length > 0);
    const hasColor = initialVariants.some((variant) => variant.color.trim().length > 0);
    return hasSize && hasColor ? 'both' : hasColor ? 'color' : 'size';
  });

  const [existingImages, setExistingImages] = useState(
    product?.images || []
  );
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [saving, setSaving] = useState(false);

  // AI states
  const [translatingName, setTranslatingName] = useState(false);
  const [translatingDesc, setTranslatingDesc] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [suggestingVariants, setSuggestingVariants] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addVariant() {
    setVariants((prev) => [
      ...prev,
      { size: '', color: '', colorHex: '#000000', stock: '0', sku: '', priceAdjustment: '' },
    ]);
  }

  function duplicateVariant(idx: number) {
    setVariants((prev) => {
      const copy = { ...prev[idx] };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  function updateVariant(idx: number, key: string, value: string) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  }

  function removeVariant(idx: number) {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  }

  // Calculate total stock across all variants
  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);

  const handleImageSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const arr = Array.from(files).slice(0, 8 - newImages.length - existingImages.length);
      const results = await Promise.all(arr.map((f) => readFileAsBase64(f)));
      setNewImages((prev) => [...prev, ...results]);
    } catch {
      toast.error(locale === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed');
    }
  }, [newImages.length, existingImages.length, locale]);

  function removeNewImage(idx: number) {
    setNewImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function removeExistingImage(idx: number) {
    const img = existingImages[idx];
    if (img?.id) setDeletedImageIds((prev) => [...prev, img.id!]);
    setExistingImages((prev) => prev.filter((_, i) => i !== idx));
  }

  // ===== AI Functions =====

  // Translate Arabic name to English (marketing tone)
  async function translateName() {
    if (!form.nameAr.trim()) {
      toast.error(locale === 'ar' ? 'اكتب الاسم بالعربي الأول' : 'Write the Arabic name first');
      return;
    }
    setTranslatingName(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.nameAr, sourceLocale: 'ar', targetLocale: 'en' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('nameEn', data.translation);
      toast.success(locale === 'ar' ? 'تمت الترجمة' : 'Translated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTranslatingName(false);
    }
  }

  // Translate Arabic short description to English (marketing tone)
  async function translateShortDesc() {
    if (!form.shortDescriptionAr.trim()) {
      toast.error(locale === 'ar' ? 'اكتب الوصف بالعربي الأول' : 'Write the Arabic description first');
      return;
    }
    setTranslatingDesc(true);
    try {
      const res = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: form.shortDescriptionAr, sourceLocale: 'ar', targetLocale: 'en' }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('shortDescriptionEn', data.translation);
      toast.success(locale === 'ar' ? 'تمت الترجمة' : 'Translated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTranslatingDesc(false);
    }
  }

  // Generate short description using AI
  async function generateDescription() {
    if (!form.nameAr.trim()) {
      toast.error(locale === 'ar' ? 'اكتب اسم المنتج الأول' : 'Write product name first');
      return;
    }
    setGeneratingDesc(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId);
      const categoryName = category ? (locale === 'ar' ? category.nameAr : category.nameEn) : '';
      const res = await fetch('/api/ai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.nameAr,
          category: categoryName,
          features: '',
          locale: 'ar',
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      set('shortDescriptionAr', data.description);
      toast.success(locale === 'ar' ? 'تم توليد الوصف' : 'Description generated');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setGeneratingDesc(false);
    }
  }

  // AI suggest variants based on product type
  async function suggestVariantsAI() {
    if (!form.nameAr.trim()) {
      toast.error(locale === 'ar' ? 'اكتب اسم المنتج الأول' : 'Write product name first');
      return;
    }
    setSuggestingVariants(true);
    try {
      const category = categories.find((c) => c.id === form.categoryId);
      const categoryName = category ? (locale === 'ar' ? category.nameAr : category.nameEn) : '';
      const res = await fetch('/api/ai/suggest-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: form.nameAr,
          category: categoryName,
          locale,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      const newVariants: typeof variants = [];
      if (data.type === 'none' || (data.sizes.length === 0 && data.colors.length === 0)) {
        toast.info(locale === 'ar' ? 'هذا المنتج لا يحتاج إلى متغيرات' : 'This product does not need variants');
        setSuggestingVariants(false);
        return;
      }
      setVariantMode(data.type === 'colors' ? 'color' : data.type === 'both' ? 'both' : 'size');
      if (data.type === 'sizes') {
        for (const size of data.sizes) {
          newVariants.push({ size, color: '', colorHex: '#000000', stock: '0', sku: '', priceAdjustment: '' });
        }
      } else if (data.type === 'colors') {
        for (const color of data.colors) {
          newVariants.push({ size: '', color: color.name, colorHex: color.hex, stock: '0', sku: '', priceAdjustment: '' });
        }
      } else if (data.type === 'both') {
        const firstColor = data.colors[0];
        for (const size of data.sizes) {
          newVariants.push({
            size,
            color: firstColor?.name || '',
            colorHex: firstColor?.hex || '#000000',
            stock: '0',
            sku: '',
            priceAdjustment: '',
          });
        }
      }
      if (newVariants.length > 0) {
        setVariants(newVariants);
        toast.success(
          locale === 'ar'
            ? `تم اقتراح ${newVariants.length} متغير`
            : `Suggested ${newVariants.length} variants`
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSuggestingVariants(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.categoryId || !regularPrice || !form.nameAr || !form.nameEn) {
      toast.error(locale === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    if (salePrice && Number(salePrice) >= Number(regularPrice)) {
      toast.error(locale === 'ar' ? 'سعر البيع يجب أن يكون أقل من السعر العادي' : 'Sale price must be lower than regular price');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        // slug and sku are auto-generated by the backend (for new products)
        // For edits, they stay as-is
        categoryId: form.categoryId,
        price: salePrice || regularPrice,
        comparePrice: salePrice ? regularPrice : null,
        costPrice: form.costPrice || null,
        hasVariants: form.hasVariants,
        isActive: form.isActive,
        isFeatured: form.isFeatured,
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        shortDescriptionAr: form.shortDescriptionAr || null,
        shortDescriptionEn: form.shortDescriptionEn || null,
        descriptionAr: form.shortDescriptionAr || null,
        descriptionEn: form.shortDescriptionEn || null,
        // Tags are now empty (removed from UI)
        tagsAr: [],
        tagsEn: [],
        variants: variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          size: v.size || null,
          color: v.color || null,
          colorHex: v.colorHex || null,
          stock: v.stock || '0',
          sku: null,
          priceAdjustment: '0', // Always 0 - removed from UI
        })),
      };

      if (isEdit) {
        // For edits, send slug and sku so they don't get overwritten
        payload.slug = form.slug;
        payload.sku = form.sku;
        payload.newImages = newImages.map((img) => ({
          base64Data: img.base64Data,
          mimeType: img.mimeType,
          fileSize: img.fileSize,
        }));
        payload.deletedImageIds = deletedImageIds;
      } else {
        payload.images = newImages.map((img) => ({
          base64Data: img.base64Data,
          mimeType: img.mimeType,
          fileSize: img.fileSize,
        }));
      }

      const url = isEdit ? `/api/admin/products/${product!.id}` : '/api/admin/products';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed');
      }

      toast.success(t('saved'));
      router.push('/admin/products');
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const canTranslateName = form.nameAr.trim().length > 0 && !translatingName;
  const canTranslateDesc = form.shortDescriptionAr.trim().length > 0 && !translatingDesc;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/products')}
          aria-label={t('back')}
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
            {isEdit ? t('editProduct') : t('newProduct')}
          </h1>
          {isEdit && (
            <p className="text-xs text-muted-foreground mt-1 font-mono" dir="ltr">
              {form.sku}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General section */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal mb-4">
            {t('general')}
          </h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('category')} *</Label>
              <Select value={form.categoryId} onValueChange={(v) => set('categoryId', v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {'—'.repeat(c.depth)} {locale === 'ar' ? c.nameAr : c.nameEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal mb-4">
            {t('pricing')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{locale === 'ar' ? 'السعر العادي *' : 'Regular Price *'}</Label>
              <Input
                type="number"
                step="0.01"
                value={regularPrice}
                onChange={(e) => setRegularPrice(e.target.value)}
                dir="ltr"
                required
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{locale === 'ar' ? 'سعر البيع (اختياري)' : 'Sale Price (optional)'}</Label>
              <Input
                type="number"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                dir="ltr"
                min="0"
                placeholder={locale === 'ar' ? 'اتركه فارغًا بدون خصم' : 'Leave blank for no sale'}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('costPrice')}</Label>
              <Input
                type="number"
                step="0.01"
                value={form.costPrice}
                onChange={(e) => set('costPrice', e.target.value)}
                dir="ltr"
                placeholder="0.00"
              />
            </div>
          </div>
        </Card>

        {/* Translations - with AI helpers */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
              {t('translations')}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-brand-mauve bg-brand-mauve/10 px-2.5 py-1 rounded-full">
              <Sparkles className="h-3 w-3" />
              {locale === 'ar' ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
            </div>
          </div>

          <div className="space-y-4">
            {/* Product Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('nameAr')} *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => set('nameAr', e.target.value)}
                  dir="rtl"
                  required
                  placeholder={locale === 'ar' ? 'اكتب الاسم بالعربي' : 'Arabic name'}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('nameEn')} *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={translateName}
                    disabled={!canTranslateName}
                    className="h-7 px-2 text-xs text-brand-mauve hover:text-brand-mauve hover:bg-brand-mauve/10"
                  >
                    {translatingName ? (
                      <Loader2 className="h-3 w-3 me-1 animate-spin" />
                    ) : (
                      <Languages className="h-3 w-3 me-1" />
                    )}
                    {locale === 'ar' ? 'ترجم بالـ AI' : 'AI Translate'}
                  </Button>
                </div>
                <Input
                  value={form.nameEn}
                  onChange={(e) => set('nameEn', e.target.value)}
                  dir="ltr"
                  required
                  placeholder={locale === 'ar' ? 'الاسم بالإنجليزي' : 'English name'}
                />
              </div>
            </div>

            {/* Short Description - with AI generate + translate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('shortDescriptionAr')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={generateDescription}
                    disabled={!form.nameAr.trim() || generatingDesc}
                    className="h-7 px-2 text-xs text-brand-mauve hover:text-brand-mauve hover:bg-brand-mauve/10"
                  >
                    {generatingDesc ? (
                      <Loader2 className="h-3 w-3 me-1 animate-spin" />
                    ) : (
                      <Wand2 className="h-3 w-3 me-1" />
                    )}
                    {locale === 'ar' ? 'توليد بالـ AI' : 'AI Generate'}
                  </Button>
                </div>
                <Textarea
                  value={form.shortDescriptionAr}
                  onChange={(e) => set('shortDescriptionAr', e.target.value)}
                  dir="rtl"
                  rows={3}
                  placeholder={locale === 'ar' ? 'وصف مختصر وجذاب للمنتج' : 'Brief attractive description'}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('shortDescriptionEn')}</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={translateShortDesc}
                    disabled={!canTranslateDesc}
                    className="h-7 px-2 text-xs text-brand-mauve hover:text-brand-mauve hover:bg-brand-mauve/10"
                  >
                    {translatingDesc ? (
                      <Loader2 className="h-3 w-3 me-1 animate-spin" />
                    ) : (
                      <Languages className="h-3 w-3 me-1" />
                    )}
                    {locale === 'ar' ? 'ترجم بالـ AI' : 'AI Translate'}
                  </Button>
                </div>
                <Textarea
                  value={form.shortDescriptionEn}
                  onChange={(e) => set('shortDescriptionEn', e.target.value)}
                  dir="ltr"
                  rows={3}
                  placeholder={locale === 'ar' ? 'الوصف بالإنجليزي' : 'English description'}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Variants - simplified (no SKU, no priceAdjustment) */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal">
                {t('variants')}
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                {locale === 'ar'
                  ? 'أضف متغيرات حسب نوع المنتج. الذكاء الاصطناعي يقترح المتغيرات المناسبة.'
                  : 'Add variants based on product type. AI suggests appropriate variants.'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={suggestVariantsAI}
                disabled={!form.nameAr.trim() || suggestingVariants}
                className="border-brand-mauve/40 text-brand-mauve hover:bg-brand-mauve/10"
              >
                {suggestingVariants ? (
                  <Loader2 className="h-4 w-4 me-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 me-1" />
                )}
                {locale === 'ar' ? 'اقتراح متغيرات' : 'AI Suggest'}
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 text-xs">
                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('totalVariants')}:</span>
                <span className="font-bold text-brand-charcoal">{variants.length}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 text-xs">
                <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t('totalStock')}:</span>
                <span className={`font-bold ${totalStock === 0 ? 'text-red-600' : totalStock < 5 ? 'text-amber-600' : 'text-emerald-600'}`}>{totalStock}</span>
              </div>
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addVariant} className="mb-4 w-full border-dashed">
            <Plus className="h-4 w-4 me-1" />
            {t('addVariant')}
          </Button>

          <div className="mb-4 rounded-lg border border-border bg-muted/20 p-3">
            <div className="mb-2 text-xs font-medium text-brand-charcoal">
              {locale === 'ar' ? 'نوع المتغير' : 'Variant type'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {([
                { value: 'size' as const, label: locale === 'ar' ? 'مقاس / حجم' : 'Size / Volume', icon: Package },
                { value: 'color' as const, label: locale === 'ar' ? 'لون' : 'Color', icon: Tag },
                { value: 'both' as const, label: locale === 'ar' ? 'مقاس + لون' : 'Size + Color', icon: Boxes },
              ]).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setVariantMode(value)}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
                    variantMode === value
                      ? 'border-brand-charcoal bg-brand-charcoal text-white'
                      : 'border-border bg-white text-muted-foreground hover:border-brand-mauve hover:text-brand-charcoal'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {locale === 'ar'
                ? 'اختر نوعًا واحدًا لتظهر لك الحقول المطلوبة فقط.'
                : 'Choose one type to show only the fields you need.'}
            </p>
          </div>

          <div className="space-y-3">
            {variants.map((v, idx) => (
              <div
                key={idx}
                className="border border-border rounded-lg p-4 bg-white"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-brand-charcoal text-white text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-brand-charcoal">
                      {t('variantNumber', { number: idx + 1 })}
                    </span>
                    {v.size && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-mauve/10 text-brand-mauve font-medium">
                        {v.size}
                      </span>
                    )}
                    {v.color && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-mauve/10 text-brand-mauve font-medium flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full border border-brand-mauve/30" style={{ backgroundColor: v.colorHex || '#000000' }} />
                        {v.color}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-brand-charcoal"
                      onClick={() => duplicateVariant(idx)}
                      aria-label={t('duplicateVariant')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeVariant(idx)}
                      aria-label={t('removeVariant')}
                      disabled={variants.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className={`grid grid-cols-1 gap-3 ${variantMode === 'both' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
                  {(variantMode === 'size' || variantMode === 'both') && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {locale === 'ar' ? 'المقاس / الحجم' : 'Size / Volume'}
                      </Label>
                      <Input
                        value={v.size}
                        onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                        placeholder={locale === 'ar' ? 'M / 50ml' : 'M / 50ml'}
                        className="h-9"
                        dir="ltr"
                      />
                    </div>
                  )}

                  {(variantMode === 'color' || variantMode === 'both') && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t('color')}</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={v.color}
                          onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                          placeholder={locale === 'ar' ? 'وردي' : 'Pink'}
                          className="h-9 flex-1"
                        />
                        <input
                          type="color"
                          value={v.colorHex || '#000000'}
                          onChange={(e) => updateVariant(idx, 'colorHex', e.target.value)}
                          className="h-9 w-9 rounded-md border border-input cursor-pointer shrink-0"
                          aria-label={t('colorHex')}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('stock')} *</Label>
                    <Input
                      type="number"
                      value={v.stock}
                      onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                      className="h-9"
                      dir="ltr"
                      min="0"
                    />
                    {parseInt(v.stock) === 0 && (
                      <p className="text-[10px] text-red-500">{locale === 'ar' ? 'نفذ' : 'Out'}</p>
                    )}
                    {parseInt(v.stock) > 0 && parseInt(v.stock) < 5 && (
                      <p className="text-[10px] text-amber-500">{locale === 'ar' ? 'منخفض' : 'Low'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Images */}
        <Card className="p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-charcoal mb-4">
            {t('image')}
          </h2>
          {isEdit && existingImages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-muted-foreground mb-2">
                {locale === 'ar' ? 'الصور الحالية' : 'Existing images'}
              </p>
              <div className="flex flex-wrap gap-3">
                {existingImages.map((img, i) => (
                  <div key={img.id || i} className="relative w-20 h-20 rounded-md overflow-hidden bg-muted">
                    <img
                      src={`data:${img.mimeType};base64,${img.base64Data}`}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {img.isPrimary && (
                      <span className="absolute top-1 start-1 text-[9px] bg-brand-charcoal text-white px-1 rounded">
                        ★
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExistingImage(i)}
                      className="absolute top-0.5 end-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-600"
                      aria-label={locale === 'ar' ? 'حذف الصورة' : 'Delete image'}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleImageSelect(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg hover:border-brand-mauve hover:bg-brand-cream transition-colors"
          >
            <Upload className="h-6 w-6 text-muted-foreground mb-2" />
            <span className="text-xs text-muted-foreground">
              {isEdit
                ? (locale === 'ar' ? 'إضافة صور جديدة' : 'Add new images')
                : t('selectImage')}
            </span>
          </button>
          {newImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {newImages.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-md overflow-hidden bg-muted">
                  <img src={img.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeNewImage(i)}
                    className="absolute top-0.5 end-0.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-red-600"
                    aria-label={t('removeVariant')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status flags */}
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
                id="isActive"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                {t('active')}
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isFeatured}
                onCheckedChange={(v) => set('isFeatured', v)}
                id="isFeatured"
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">
                {t('featured')}
              </Label>
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur p-4 -mx-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/products')}
            disabled={saving}
          >
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={saving} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white min-w-32">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin me-1" />
            ) : (
              <Save className="h-4 w-4 me-1" />
            )}
            {saving ? t('saving') : isEdit ? t('update') : t('create')}
          </Button>
        </div>
      </form>
    </div>
  );
}
