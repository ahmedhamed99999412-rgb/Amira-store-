import ZAI from 'z-ai-web-dev-sdk';

type ChatRole = 'user' | 'assistant';

type ChatHistoryItem = {
  role: ChatRole;
  content: string;
};

type StoreAIInfo = {
  name: string;
  whatsapp: string;
  freeShipping: boolean;
};

type SmartSearchResult = {
  keywords: string[];
  category: string | null;
  explanation: string;
};

type SuggestedVariantResult = {
  type: 'sizes' | 'colors' | 'both' | 'none';
  sizes: string[];
  colors: { name: string; hex: string }[];
  explanation: string;
};

const AI_TIMEOUT_MS = 30_000;
const MAX_AI_TEXT_RESPONSE = 20_000;
const MAX_AI_SKU_LENGTH = 32;

let zaiInstance: any = null;

export class AIProviderUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('AI provider unavailable', { cause });
    this.name = 'AIProviderUnavailableError';
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = AI_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('AI request timed out')), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function getTextContent(response: any): string {
  const content = response?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new Error('AI returned an invalid response');
  const text = content.trim();
  if (!text || text.length > MAX_AI_TEXT_RESPONSE) throw new Error('AI returned an invalid response');
  return text;
}

function extractJson(content: string): unknown {
  const match = content.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : content;
  return JSON.parse(candidate);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 120);
}

function parseSmartSearchResult(content: string): SmartSearchResult {
  const value = extractJson(content);
  if (!value || typeof value !== 'object') throw new Error('AI returned invalid search criteria');
  const result = value as Record<string, unknown>;
  const category = result.category;
  const explanation = result.explanation;
  const keywords = result.keywords;
  if (!isStringArray(keywords)) throw new Error('AI returned invalid search keywords');
  if (!(category === null || typeof category === 'string')) throw new Error('AI returned invalid search category');
  if (typeof explanation !== 'string' || explanation.length > 1000) throw new Error('AI returned invalid search explanation');
  return { keywords, category: typeof category === 'string' ? category.trim() || null : null, explanation: explanation.trim() };
}

function parseVariantsResult(content: string): SuggestedVariantResult {
  const value = extractJson(content);
  if (!value || typeof value !== 'object') throw new Error('AI returned invalid variants');
  const result = value as Record<string, unknown>;
  const type = result.type;
  const sizes = result.sizes;
  const colors = result.colors;
  const explanation = result.explanation;
  if (!['sizes', 'colors', 'both', 'none'].includes(String(type))) throw new Error('AI returned invalid variant type');
  if (!isStringArray(sizes) || sizes.length > 8) throw new Error('AI returned invalid sizes');
  if (!Array.isArray(colors) || colors.length > 4) throw new Error('AI returned invalid colors');
  const normalizedColors: { name: string; hex: string }[] = [];
  for (const color of colors) {
    if (!color || typeof color !== 'object') throw new Error('AI returned invalid color');
    const item = color as Record<string, unknown>;
    if (typeof item.name !== 'string' || item.name.trim().length === 0 || item.name.length > 80) throw new Error('AI returned invalid color name');
    if (typeof item.hex !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(item.hex)) throw new Error('AI returned invalid color hex');
    normalizedColors.push({ name: item.name.trim(), hex: item.hex.toUpperCase() });
  }
  if (typeof explanation !== 'string' || explanation.length > 1000) throw new Error('AI returned invalid variant explanation');
  return {
    type: type as SuggestedVariantResult['type'],
    sizes: sizes.map((size) => size.trim()),
    colors: normalizedColors,
    explanation: explanation.trim(),
  };
}

function validateGeneratedSKU(content: string): string {
  const sku = content.replace(/['"`]/g, '').trim().toUpperCase();
  if (!/^AMS-[A-Z0-9]{3,5}$/.test(sku) || sku.length > MAX_AI_SKU_LENGTH) {
    return 'AMS-PRD';
  }
  return sku;
}

export async function getAI() {
  if (!zaiInstance) {
    try {
      zaiInstance = await withTimeout(ZAI.create());
    } catch (error) {
      throw new AIProviderUnavailableError(error);
    }
  }
  return zaiInstance;
}

async function createCompletion(ai: any, payload: any) {
  try {
    return await withTimeout(ai.chat.completions.create(payload));
  } catch (error) {
    throw new AIProviderUnavailableError(error);
  }
}

// Smart search: convert natural language to product search criteria
export async function smartSearch(query: string, locale: string): Promise<SmartSearchResult> {
  const ai = await getAI();
  const systemPrompt = `You are a product search assistant for AMIRA STORE, an Egyptian e-commerce store. Based on the user's natural language query, extract search criteria as JSON. Categories: women, men, kids, baby, beauty, fragrance. Respond with JSON only: {"keywords":["k1"],"category":"slug-or-null","explanation":"brief in ${locale === 'ar' ? 'Arabic' : 'English'}"}`;
  const response = await createCompletion(ai, {
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }],
    thinking: { type: 'disabled' },
  });
  try {
    return parseSmartSearchResult(getTextContent(response));
  } catch {
    return { keywords: query.split(/\s+/).filter(Boolean).slice(0, 20), category: null, explanation: query.slice(0, 1000) };
  }
}

export async function generateDescription(name: string, category: string, features: string, locale: string): Promise<string> {
  const ai = await getAI();
  const response = await createCompletion(ai, {
    messages: [{ role: 'user', content: `Generate a professional product description in ${locale === 'ar' ? 'Arabic' : 'English'} for: ${name} (${category}). Features: ${features}. 2-3 paragraphs, marketing tone, no emojis.` }],
    thinking: { type: 'disabled' },
  });
  return getTextContent(response);
}

export async function translateText(text: string, src: string, tgt: string): Promise<string> {
  const ai = await getAI();
  const systemPrompt = `You are a professional e-commerce copywriter for AMIRA STORE, an Egyptian fashion and beauty retailer.
Translate the following text from ${src === 'ar' ? 'Arabic' : 'English'} to ${tgt === 'ar' ? 'Arabic' : 'English'}.

Rules:
- Use MARKETING tone, not literal translation
- Make it appealing and natural for shoppers
- Adapt product names to how they're actually sold in stores
- Keep it concise and catchy
- Preserve any brand-relevant keywords
- Return ONLY the translation, no explanations`;
  const response = await createCompletion(ai, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    thinking: { type: 'disabled' },
  });
  return getTextContent(response);
}

export async function generateSKU(nameAr: string, nameEn: string): Promise<string> {
  const ai = await getAI();
  const response = await createCompletion(ai, {
    messages: [
      {
        role: 'system',
        content: `You are a product catalog manager for AMIRA STORE. Generate a unique, professional product code (SKU) based on the product name.

Rules:
- Format: AMS-XXXXX (AMS = AMIRA Store prefix)
- XXXXX = 3-5 character code derived from product name
- Use English letters and numbers only
- Keep it short, memorable, and professional
- Return ONLY the SKU code, nothing else`,
      },
      { role: 'user', content: `Product name (Arabic): ${nameAr}
Product name (English): ${nameEn}` },
    ],
    thinking: { type: 'disabled' },
  });
  return validateGeneratedSKU(getTextContent(response));
}

export async function suggestVariants(
  productName: string,
  category: string,
  locale: string
): Promise<SuggestedVariantResult> {
  const ai = await getAI();
  const systemPrompt = `You are an e-commerce product specialist for AMIRA STORE. Based on the product name and category, suggest appropriate variant options.

Product types and their variants:
- Clothing (dresses, shirts, pants): needs SIZES (XS, S, M, L, XL, XXL) and up to 3-4 COLORS max
- Shoes: needs SHOE SIZES (36-44) and up to 3 COLORS max
- Perfumes/Fragrances: needs VOLUME/SIZE only (30ml, 50ml, 100ml) - NO colors
- Bags/Accessories: needs COLORS only (max 3-4) - NO sizes
- Beauty/Skincare: needs VOLUME/SIZE only (30ml, 50ml, 100ml) - NO colors
- Jewelry/Watches: needs COLORS only (Gold, Silver, Rose Gold) - NO sizes
- Other simple products: NO variants needed

IMPORTANT: Keep the number of variants reasonable (max 6-8 total). For "both" type, suggest 3-4 sizes and 2-3 colors only, NOT a full matrix.

Respond with JSON ONLY: {"type":"sizes|colors|both|none","sizes":["..."],"colors":[{"name":"${locale === 'ar' ? 'الاسم بالعربي' : 'Name in English'}","hex":"#RRGGBB"}],"explanation":"brief reason in ${locale === 'ar' ? 'Arabic' : 'English'}"}`;
  const response = await createCompletion(ai, {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Product: ${productName}\nCategory: ${category}` },
    ],
    thinking: { type: 'disabled' },
  });
  try {
    return parseVariantsResult(getTextContent(response));
  } catch {
    return { type: 'none', sizes: [], colors: [], explanation: 'Could not generate suggestions' };
  }
}

export async function chatWithAssistant(message: string, history: ChatHistoryItem[], locale: string, info: StoreAIInfo): Promise<string> {
  const ai = await getAI();
  const safeHistory = history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({ role: item.role, content: item.content.trim().slice(0, 4000) }))
    .filter((item) => item.content.length > 0)
    .slice(-5);
  const systemPrompt = `You are ${info.name}'s assistant. WhatsApp: ${info.whatsapp}. Payment: COD. Shipping: confirm after receiving the customer's address. Returns: direct the customer to WhatsApp for assistance. Respond in ${locale === 'ar' ? 'Arabic' : 'English'}. Be concise.`;
  const response = await createCompletion(ai, {
    messages: [{ role: 'system', content: systemPrompt }, ...safeHistory, { role: 'user', content: message }],
    thinking: { type: 'disabled' },
  });
  return getTextContent(response);
}
