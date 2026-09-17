'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SortSelect({ locale, current }: { locale: string; current: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  }

  const options = [
    { value: 'newest', labelAr: 'الأحدث', labelEn: 'Newest' },
    { value: 'price-asc', labelAr: 'السعر: من الأقل للأعلى', labelEn: 'Price: Low to High' },
    { value: 'price-desc', labelAr: 'السعر: من الأعلى للأقل', labelEn: 'Price: High to Low' },
    { value: 'rating', labelAr: 'الأعلى تقييماً', labelEn: 'Top Rated' },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {locale === 'ar' ? 'ترتيب:' : 'Sort:'}
      </span>
      <Select value={current} onValueChange={onChange}>
        <SelectTrigger className="w-[200px] h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {locale === 'ar' ? opt.labelAr : opt.labelEn}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
