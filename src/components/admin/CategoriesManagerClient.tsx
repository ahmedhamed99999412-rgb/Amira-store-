'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronLeft,
  Loader2,
  FolderTree,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

type CategoryNode = {
  id: string;
  parentId: string | null;
  slug: string;
  name: string;
  nameAr: string;
  nameEn: string;
  order: number;
  isActive: boolean;
  image: { base64Data: string; mimeType: string } | null;
  productCount: number;
  children?: CategoryNode[];
};

type FlatCategory = { id: string; parentId: string | null; name: string; slug: string; depth: number; path: string[] };

function flatten(cats: CategoryNode[], depth = 0, out: FlatCategory[] = [], parentId: string | null = null, parentPath: string[] = []) {
  for (const c of cats) {
    const path = [...parentPath, c.name];
    out.push({ id: c.id, parentId, name: c.name, slug: c.slug, depth, path });
    if (c.children?.length) flatten(c.children, depth + 1, out, c.id, path);
  }
  return out;
}

function readFileAsBase64(file: File): Promise<{ base64Data: string; mimeType: string; fileSize: number; preview: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({
        base64Data: result.split(',')[1],
        mimeType: file.type,
        fileSize: file.size,
        preview: result,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function CategoriesManagerClient({ locale }: { locale: string }) {
  const t = useTranslations('admin');
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    nameAr: '',
    nameEn: '',
    slug: '',
    parentId: '',
    isActive: true,
  });
  const [imageData, setImageData] = useState<{ base64Data: string; mimeType: string; fileSize: number; preview: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/categories', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCategories(data.categories || []);
      // Default expand all roots
      const exp: Record<string, boolean> = {};
      for (const c of data.categories || []) exp[c.id] = true;
      setExpanded(exp);
    } catch {
      toast.error(locale === 'ar' ? 'فشل تحميل الفئات' : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const flatList = flatten(categories);

  function openAdd() {
    setEditing(null);
    setForm({ nameAr: '', nameEn: '', slug: '', parentId: '', isActive: true });
    setImageData(null);
    setDialogOpen(true);
  }

  function openEdit(cat: CategoryNode) {
    setEditing(cat);
    setForm({
      nameAr: cat.nameAr,
      nameEn: cat.nameEn,
      slug: cat.slug,
      parentId: cat.parentId || '',
      isActive: cat.isActive,
    });
    setImageData(null);
    setDialogOpen(true);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleImage(file: File | undefined) {
    if (!file) return;
    try {
      const data = await readFileAsBase64(file);
      setImageData(data);
    } catch {
      toast.error(locale === 'ar' ? 'فشل رفع الصورة' : 'Image upload failed');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nameAr || !form.nameEn || !form.slug) {
      toast.error(locale === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nameAr: form.nameAr,
        nameEn: form.nameEn,
        slug: form.slug,
        parentId: form.parentId || null,
        isActive: form.isActive,
      };
      if (imageData) {
        payload.image = {
          base64Data: imageData.base64Data,
          mimeType: imageData.mimeType,
          fileSize: imageData.fileSize,
        };
      }

      const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');

      toast.success(t('saved'));
      setDialogOpen(false);
      load();
      router.refresh();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  const currentEntry = editing ? flatList.find((category) => category.id === editing.id) : null;
  const selectedParent = form.parentId ? flatList.find((category) => category.id === form.parentId) : null;
  const descendantIds = new Set<string>();
  if (editing) {
    const descendants = flatList.filter((category) => category.parentId === editing.id);
    while (descendants.length) {
      const descendant = descendants.shift();
      if (!descendant || descendantIds.has(descendant.id)) continue;
      descendantIds.add(descendant.id);
      descendants.push(...flatList.filter((category) => category.parentId === descendant.id));
    }
  }
  const currentPath = currentEntry?.path || [];
  const newCategoryName = locale === 'ar' ? form.nameAr : form.nameEn;
  const previewPath = [...(selectedParent?.path || []), newCategoryName || (editing?.name || t('name'))];
  const parentEntry = editing?.parentId ? flatList.find((category) => category.id === editing.parentId) : null;
  const displayedParent = editing ? parentEntry : selectedParent;
  const displayedGrandparent = displayedParent?.parentId
    ? flatList.find((category) => category.id === displayedParent.parentId)
    : null;

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      toast.success(t('deleted'));
      setDeleteId(null);
      load();
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed';
      if (msg.includes('products')) {
        toast.error(t('cannotDeleteCategory'));
      } else if (msg.includes('subcategor') || msg.includes('children')) {
        toast.error(t('cannotDeleteCategoryWithChildren'));
      } else {
        toast.error(msg);
      }
    } finally {
      setDeleting(false);
    }
  }

  function renderNode(node: CategoryNode, depth: number): React.ReactNode {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = expanded[node.id];
    return (
      <div key={node.id}>
        <div
          className="flex items-center gap-2 py-2.5 px-2 hover:bg-muted/30 rounded-md"
          style={{ paddingInlineStart: `${depth * 1.5}rem` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 hover:bg-muted rounded"
              aria-label={isOpen ? t('collapse') : t('expand')}
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <div className="w-9 h-9 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {node.image ? (
               
              <img
                src={`data:${node.image.mimeType};base64,${node.image.base64Data}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-brand-charcoal truncate">
                {locale === 'ar' ? node.nameAr : node.nameEn}
              </span>
              {!node.isActive && (
                <Badge variant="secondary" className="text-[10px]">
                  {t('inactive')}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground" dir="ltr">
              {node.slug} · {node.productCount} {t('productCount')}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(node)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => setDeleteId(node.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="border-s border-border ms-4">
            {node.children!.map((c) => renderNode(c, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl lg:text-3xl font-medium text-brand-charcoal">
            {t('categories')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {locale === 'ar'
              ? `${flatList.length} فئة`
              : `${flatList.length} categories`}
          </p>
        </div>
        <Button onClick={openAdd} className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white">
          <Plus className="h-4 w-4 me-1" />
          {t('addCategory')}
        </Button>
      </div>

      <Card className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderTree className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">{t('noCategories')}</p>
          </div>
        ) : (
          <div className="space-y-0.5">{categories.map((c) => renderNode(c, 0))}</div>
        )}
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? t('editCategory') : t('addCategory')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('nameAr')} *</Label>
                <Input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  dir="rtl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{t('nameEn')} *</Label>
                <Input
                  value={form.nameEn}
                  onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                  dir="ltr"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('slug')} *</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                dir="ltr"
                placeholder="women-dresses"
                required
              />
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">{t('parentCategory')}</div>
                  <div className="font-medium mt-1">{displayedParent?.name || t('none')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('grandparentCategory')}</div>
                  <div className="font-medium mt-1">{displayedGrandparent?.name || t('none')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('treePosition')}</div>
                  <div className="font-medium mt-1">{editing ? t('editCategory') : t('addCategory')}</div>
                </div>
              </div>
              {editing && (
                <div>
                  <div className="text-xs text-muted-foreground">{t('currentPath')}</div>
                  <div className="text-sm font-medium mt-1 break-words">{currentPath.join(' → ')}</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('parentCategory')}</Label>
              <Select value={form.parentId || '__none__'} onValueChange={(v) => setForm({ ...form, parentId: v === '__none__' ? '' : v })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('none')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('none')}</SelectItem>
                  {flatList.filter((category) => category.id !== editing?.id && !descendantIds.has(category.id)).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <span className="font-mono text-muted-foreground me-1">{'· '.repeat(category.depth)}</span>
                      {category.name}
                      <span className="text-xs text-muted-foreground ms-2">({category.path.join(' → ')})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-md border border-brand-mauve/30 bg-brand-cream/40 px-3 py-2 text-sm">
                <div className="text-xs text-muted-foreground">{t('newPathPreview')}</div>
                <div className="font-medium mt-1 break-words">{previewPath.join(' → ')}</div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('imageUpload')}</Label>
              <input
                id="cat-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImage(e.target.files?.[0])}
              />
              {imageData ? (
                <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted">
                  { }
                  <img src={imageData.preview} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageData(null)}
                    className="absolute top-0.5 end-0.5 bg-black/60 text-white rounded-full p-0.5"
                    aria-label="remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('cat-image')?.click()}
                  className="flex items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg hover:border-brand-mauve hover:bg-brand-cream transition-colors"
                >
                  <Upload className="h-5 w-5 text-muted-foreground me-2" />
                  <span className="text-xs text-muted-foreground">{t('selectImage')}</span>
                </button>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-brand-charcoal hover:bg-brand-charcoal/90 text-white"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin me-1" />}
                {editing ? t('update') : t('create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteCategory')}</AlertDialogTitle>
            <AlertDialogDescription>{t('confirmDelete')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {t('deleteCategory')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
