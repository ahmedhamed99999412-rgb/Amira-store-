import { db } from '@/lib/db';
import { multiplyMoney } from '@/lib/money';

// Format Egyptian phone for WhatsApp: 01019003677 → 201019003677
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    return '20' + cleaned.slice(1);
  }
  if (cleaned.startsWith('20')) {
    return cleaned;
  }
  return cleaned;
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
  lines.push('═'.repeat(40));
  lines.push('');
  lines.push(isAr ? `طلب جديد رقم: ${order.orderNumber}` : `New Order: ${order.orderNumber}`);
  lines.push(isAr ? `التاريخ: ${new Date().toLocaleString('ar-EG')}` : `Date: ${new Date().toLocaleString('en-US')}`);
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
  lines.push(isAr ? '🛍️ تفاصيل الطلب:' : '🛍️ Order Details:');
  lines.push('─'.repeat(30));
  order.items.forEach((item, idx) => {
    const name = isAr ? item.productNameAr : item.productNameEn;
    const itemTotal = multiplyMoney(item.productPrice, item.quantity);
    lines.push(`${idx + 1}. ${name}`);
    lines.push(isAr ? `   الكمية: ${item.quantity} × ${formatPrice(item.productPrice, locale)}` : `   Qty: ${item.quantity} × ${formatPrice(item.productPrice, locale)}`);
    lines.push(`   = ${formatPrice(itemTotal, locale)}`);
    lines.push('');
  });
  lines.push('─'.repeat(30));
  lines.push('');

  // Totals
  lines.push(isAr ? `💰 إجمالي المنتجات: ${formatPrice(order.subtotal, locale)}` : `💰 Subtotal: ${formatPrice(order.subtotal, locale)}`);

  if (order.shippingStatus === 'FREE') {
    lines.push(isAr ? '🚚 الشحن: مجاني 🎉' : '🚚 Shipping: FREE 🎉');
  } else {
    lines.push(isAr ? '🚚 الشحن: سيتم تحديده حسب العنوان' : '🚚 Shipping: To be determined based on address');
  }
  lines.push(isAr ? '💵 طريقة الدفع: عند الاستلام' : '💵 Payment: Cash on Delivery');
  lines.push('');

  if (order.shippingStatus !== 'FREE') {
    lines.push(isAr ? `💰 الإجمالي: ${formatPrice(order.total, locale)} + الشحن` : `💰 Total: ${formatPrice(order.total, locale)} + shipping`);
  } else {
    lines.push(isAr ? `💰 الإجمالي: ${formatPrice(order.total, locale)}` : `💰 Total: ${formatPrice(order.total, locale)}`);
  }
  lines.push('');

  // Footer
  lines.push('═'.repeat(40));
  lines.push(isAr ? `شكراً لثقتك في ${storeName} 💕` : `Thank you for shopping with ${storeName} 💕`);
  if (order.shippingStatus !== 'FREE') {
    lines.push(isAr ? 'سنتواصل معك خلال 24 ساعة لتأكيد الطلب وتحديد تكلفة الشحن' : 'We will contact you within 24 hours to confirm the order and determine shipping cost');
  } else {
    lines.push(isAr ? 'سنتواصل معك خلال 24 ساعة لتأكيد الطلب' : 'We will contact you within 24 hours to confirm your order');
  }
  lines.push('═'.repeat(40));

  return lines.join('\n');
}
