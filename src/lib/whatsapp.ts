import { db } from '@/lib/db';
import { multiplyMoney } from '@/lib/money';

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

// Generate the full order message for WhatsApp
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
  const settings = await db.storeSettings.findUnique({ where: { id: 'singleton' } });
  const storeName = locale === 'ar' ? settings?.storeNameAr || 'AMIRA STORE' : settings?.storeNameEn || 'AMIRA STORE';

  const isAr = locale === 'ar';
  const lines: string[] = [];

  // Header
  lines.push(isAr ? `🌹 مرحباً بك في ${storeName} 🌹` : `🌹 Welcome to ${storeName} 🌹`);
  lines.push(isAr ? 'شكرًا لاختيارك متجرنا، نحن سعداء بخدمتك' : 'Thank you for choosing our store, we are happy to serve you');
  lines.push('═'.repeat(42));
  lines.push('');
  lines.push(isAr ? `📦 طلب جديد رقم: ${order.orderNumber}` : `📦 New order: ${order.orderNumber}`);
  lines.push(isAr ? `📅 التاريخ: ${new Date().toLocaleString('ar-EG')}` : `📅 Date: ${new Date().toLocaleString('en-US')}`);
  lines.push('');

  // Customer info
  lines.push(isAr ? '👤 بيانات العميل:' : '👤 Customer Info:');
  lines.push(isAr ? `الاسم: ${order.guestName}` : `Name: ${order.guestName}`);
  lines.push(isAr ? `التليفون: ${order.guestPhone}` : `Phone: ${order.guestPhone}`);
  lines.push(isAr ? `العنوان: ${order.guestAddress}` : `Address: ${order.guestAddress}`);
  lines.push(isAr ? `المحافظة: ${order.governorate}` : `Governorate: ${order.governorate}`);
  lines.push(isAr ? `المدينة: ${order.city}` : `City: ${order.city}`);
  if (order.landmarks) {
    lines.push(isAr ? `علامة مميزة: ${order.landmarks}` : `Landmarks: ${order.landmarks}`);
  }
  if (order.guestNotes) {
    lines.push(isAr ? `ملاحظات: ${order.guestNotes}` : `Notes: ${order.guestNotes}`);
  }
  lines.push('');

  // Items
  lines.push(isAr ? '🛍️ تفاصيل الطلب:' : '🛍️ Order details:');
  lines.push('─'.repeat(34));
  order.items.forEach((item, idx) => {
    const name = isAr ? item.productNameAr : item.productNameEn;
    const itemTotal = multiplyMoney(item.productPrice, item.quantity);
    lines.push(`${idx + 1}. ${name}`);
    lines.push(isAr ? `   الكمية: ${item.quantity} × ${formatPrice(item.productPrice, locale)}` : `   Qty: ${item.quantity} × ${formatPrice(item.productPrice, locale)}`);
    lines.push(`   = ${formatPrice(itemTotal, locale)}`);
    lines.push('');
  });
  lines.push('─'.repeat(34));
  lines.push('');

  // Totals
  lines.push(isAr ? `💰 إجمالي المنتجات: ${formatPrice(order.subtotal, locale)}` : `💰 Subtotal: ${formatPrice(order.subtotal, locale)}`);

  if (order.shippingStatus === 'FREE') {
    lines.push(isAr ? '🚚 الشحن: مجاني 🎉' : '🚚 Shipping: FREE 🎉');
  } else {
    lines.push(isAr ? '🚚 الشحن: سيتم تحديده بعد إرسال عنوان العميل' : '🚚 Shipping: will be confirmed after sending the customer address');
  }
  lines.push(isAr ? '💵 طريقة الدفع: عند الاستلام' : '💵 Payment: Cash on Delivery');
  lines.push('');

  lines.push(isAr ? `📍 يرجى إرسال عنوانك بالتفصيل حتي نتمكن من تحديد تكلفة الشحن بدقة قبل تأكيد الطلب.` : `📍 Please send your full address so we can determine the shipping cost accurately before confirming the order.`);
  lines.push(isAr ? `💰 الإجمالي الحالي: ${formatPrice(order.total, locale)}` : `💰 Current total: ${formatPrice(order.total, locale)}`);
  lines.push('');

  // Footer
  lines.push('═'.repeat(42));
  lines.push(isAr ? `🤍 شكراً لثقتك في ${storeName} 🌷` : `🤍 Thank you for trusting ${storeName} 🌷`);
  if (order.shippingStatus !== 'FREE') {
    lines.push(isAr ? 'بعد إرسال عنوانك، سنتواصل معك لتأكيد تكلفة الشحن ثم نكمل الطلب' : 'After sending your address, we will contact you to confirm the shipping cost and complete the order');
  } else {
    lines.push(isAr ? 'سنتواصل معك خلال 24 ساعة لتأكيد الطلب' : 'We will contact you within 24 hours to confirm your order');
  }
  lines.push('═'.repeat(42));

  return lines.join('\n');
}
