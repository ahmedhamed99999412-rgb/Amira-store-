type LocalizedBannerLink = { ar: string; en: string };

const LINK_PREFIX = 'localized:';

export function parseBannerLink(value: string | null | undefined): LocalizedBannerLink {
  if (!value) return { ar: '', en: '' };
  if (value.startsWith(LINK_PREFIX)) {
    try {
      const parsed = JSON.parse(value.slice(LINK_PREFIX.length)) as Partial<LocalizedBannerLink>;
      return { ar: parsed.ar || '', en: parsed.en || '' };
    } catch {
      return { ar: '', en: value };
    }
  }
  return { ar: value, en: value };
}

export function serializeBannerLink(ar: string | null | undefined, en: string | null | undefined): string | null {
  const links = { ar: ar?.trim() || '', en: en?.trim() || '' };
  if (!links.ar && !links.en) return null;
  if (links.ar === links.en) return links.ar;
  return `${LINK_PREFIX}${JSON.stringify(links)}`;
}

export function getBannerLink(value: string | null | undefined, locale: string): string | null {
  const links = parseBannerLink(value);
  return (locale === 'ar' ? links.ar : links.en) || links.en || links.ar || null;
}