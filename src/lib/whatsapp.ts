// Format Egyptian phone for WhatsApp: 01019003677 → 201019003677
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.trim().replace(/\D/g, '');
  if (!cleaned) return '';

  let normalized = cleaned.startsWith('00') ? cleaned.slice(2) : cleaned;
  if (normalized.startsWith('0')) {
    normalized = '20' + normalized.slice(1);
  } else if (normalized.startsWith('1') && normalized.length === 10) {
    normalized = '20' + normalized;
  }

  if (normalized.length < 8 || normalized.length > 15) return '';
  return normalized;
}

// Build wa.me URL with pre-filled message
export function buildWhatsAppUrl(phone: string, message: string): string {
  const formatted = formatPhoneForWhatsApp(phone);
  return `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`;
}

// Generate unique order number: ORD-YYYY-XXXXXX
export function generateOrderNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ORD-${year}-${random}`;
}

// Format price for WhatsApp message
function formatPrice(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return locale === 'ar' ? `${formatted} ج.م` : `EGP ${formatted}`;
}

// Generate the concise order confirmation message for WhatsApp.
export async function generateOrderMessage(
  order: {
    orderNumber: string;
    guestName: string;
    guestPhone: string;
    guestAddress: string;
    governorate: string;
    city: string;
    landmarks?: string | null;
    guestNotes?: string | null;
    subtotal: number;
    shippingCost?: number | null;
    shippingStatus: string;
    total: number;
    items: Array<{
      productNameAr: string;
      productNameEn: string;
      productPrice: number;
      quantity: number;
    }>;
  },
  locale: string = 'ar'
): Promise<string> {
  return [
    '👋 أهلًا بك في أميرا ستور ✨',
    'شكرًا لطلبك، سعداء باختيارك لنا 💖',
    '',
    '🛍️ تفاصيل طلبك:',
    `رقم الطلب: #${order.orderNumber}`,
    `الإجمالي: ${formatPrice(order.total, 'ar')}`,
    '',
    '📍 من فضلك أرسل لنا عنوان التوصيل بالتفصيل لمعرفة تكلفة الشحن وتأكيد الطلب 🚚',
    '',
    'ننتظرك 💕',
  ].join('\n');
}
