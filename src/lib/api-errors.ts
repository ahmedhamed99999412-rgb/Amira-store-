import { NextResponse } from 'next/server';

export async function safeJsonBody(req: Request): Promise<unknown | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

type ApiLocale = 'ar' | 'en';

type ApiErrorCode =
  | 'INVALID_REQUEST_BODY'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHORIZED'
  | 'INVALID_SEARCH_QUERY'
  | 'INVALID_COUPON_REQUEST'
  | 'COUPON_NOT_FOUND'
  | 'COUPON_EXPIRED'
  | 'COUPON_MIN_ORDER'
  | 'COUPON_LIMIT'
  | 'PRODUCT_NOT_FOUND'
  | 'VARIANT_REQUIRED'
  | 'VARIANT_NOT_FOUND'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_VARIANT_ID'
  | 'PRODUCT_ID_REQUIRED'
  | 'INVALID_QUANTITY'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'IDEMPOTENCY_OWNER_CONFLICT'
  | 'CART_ITEM_NOT_FOUND'
  | 'ORDER_NOT_FOUND'
  | 'TRACKING_REQUIRED'
  | 'INVALID_TRACKING_PARAMETERS'
  | 'ADDRESS_NOT_FOUND'
  | 'INVALID_ADDRESS_DATA'
  | 'INVALID_FULL_NAME'
  | 'INVALID_PHONE'
  | 'IMAGE_NOT_FOUND'
  | 'INVALID_PAGE'
  | 'INVALID_PAGE_SIZE'
  | 'INVALID_PRICE_RANGE'
  | 'INVALID_SORT'
  | 'REVIEW_NOT_FOUND'
  | 'INVALID_MODERATION_STATUS'
  | 'INVALID_AI_REQUEST'
  | 'AI_PROVIDER_UNAVAILABLE'
  | 'FORBIDDEN'
  | 'INTERNAL_SERVER_ERROR';

const messages: Record<ApiLocale, Record<ApiErrorCode, string>> = {
  ar: {
    INVALID_REQUEST_BODY: 'بيانات الطلب غير صحيحة',
    TOO_MANY_REQUESTS: 'عدد المحاولات كبير جدًا، حاول مرة أخرى لاحقًا',
    UNAUTHORIZED: 'يجب تسجيل الدخول لإجراء هذه العملية',
    INVALID_SEARCH_QUERY: 'عبارة البحث غير صحيحة',
    INVALID_COUPON_REQUEST: 'بيانات التحقق من الكوبون غير صحيحة',
    COUPON_NOT_FOUND: 'الكوبون غير متاح أو غير مفعل',
    COUPON_EXPIRED: 'انتهت صلاحية الكوبون',
    COUPON_MIN_ORDER: 'قيمة الطلب لا تحقق الحد الأدنى المطلوب للكوبون',
    COUPON_LIMIT: 'تم الوصول إلى الحد الأقصى لاستخدام الكوبون',
    PRODUCT_NOT_FOUND: 'المنتج غير متوفر',
    VARIANT_REQUIRED: 'يرجى اختيار المقاس أو اللون المطلوب',
    VARIANT_NOT_FOUND: 'الخيار المحدد للمنتج غير متوفر',
    INSUFFICIENT_STOCK: 'الكمية المطلوبة غير متوفرة حاليًا',
    INVALID_VARIANT_ID: 'الخيار المحدد غير صحيح',
    PRODUCT_ID_REQUIRED: 'معرّف المنتج مطلوب',
    INVALID_QUANTITY: 'الكمية غير صحيحة',
    INVALID_IDEMPOTENCY_KEY: 'معرّف الطلب غير صالح',
    IDEMPOTENCY_OWNER_CONFLICT: 'لا يمكن إعادة استخدام طلب الدفع هذا',
    CART_ITEM_NOT_FOUND: 'عنصر السلة غير موجود',
    ORDER_NOT_FOUND: 'الطلب غير موجود',
    TRACKING_REQUIRED: 'رقم الطلب ورقم التليفون مطلوبان',
    INVALID_TRACKING_PARAMETERS: 'بيانات تتبع الطلب غير صحيحة',
    ADDRESS_NOT_FOUND: 'العنوان غير موجود',
    INVALID_ADDRESS_DATA: 'بيانات العنوان غير صحيحة',
    INVALID_FULL_NAME: 'الاسم الكامل غير صحيح',
    INVALID_PHONE: 'رقم التليفون غير صحيح',
    IMAGE_NOT_FOUND: 'الصورة غير موجودة',
    INVALID_PAGE: 'رقم الصفحة غير صحيح',
    INVALID_PAGE_SIZE: 'حجم الصفحة غير صحيح',
    INVALID_PRICE_RANGE: 'نطاق السعر غير صحيح',
    INVALID_SORT: 'طريقة الترتيب غير صحيحة',
    REVIEW_NOT_FOUND: 'التقييم غير موجود',
    INVALID_MODERATION_STATUS: 'حالة اعتماد التقييم غير صحيحة',
    INVALID_AI_REQUEST: 'بيانات طلب الذكاء الاصطناعي غير صحيحة',
    AI_PROVIDER_UNAVAILABLE: 'خدمة الذكاء الاصطناعي غير متاحة حاليًا',
    FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذه العملية',
    INTERNAL_SERVER_ERROR: 'حدث خطأ داخلي. حاول مرة أخرى لاحقًا',
  },
  en: {
    INVALID_REQUEST_BODY: 'Invalid request data',
    TOO_MANY_REQUESTS: 'Too many attempts. Please try again later',
    UNAUTHORIZED: 'You must be signed in to perform this action',
    INVALID_SEARCH_QUERY: 'Invalid search query',
    INVALID_COUPON_REQUEST: 'Invalid coupon validation data',
    COUPON_NOT_FOUND: 'Coupon is unavailable or inactive',
    COUPON_EXPIRED: 'Coupon has expired',
    COUPON_MIN_ORDER: 'Order total does not meet the coupon minimum',
    COUPON_LIMIT: 'Coupon usage limit has been reached',
    PRODUCT_NOT_FOUND: 'Product is unavailable',
    VARIANT_REQUIRED: 'Please select the required product options',
    VARIANT_NOT_FOUND: 'The selected product option is unavailable',
    INSUFFICIENT_STOCK: 'The requested quantity is currently unavailable',
    INVALID_VARIANT_ID: 'Invalid product option',
    PRODUCT_ID_REQUIRED: 'Product ID is required',
    INVALID_QUANTITY: 'Invalid quantity',
    INVALID_IDEMPOTENCY_KEY: 'Invalid request identifier',
    IDEMPOTENCY_OWNER_CONFLICT: 'This checkout request cannot be reused',
    CART_ITEM_NOT_FOUND: 'Cart item was not found',
    ORDER_NOT_FOUND: 'Order was not found',
    TRACKING_REQUIRED: 'Order number and phone are required',
    INVALID_TRACKING_PARAMETERS: 'Invalid order tracking data',
    ADDRESS_NOT_FOUND: 'Address was not found',
    INVALID_ADDRESS_DATA: 'Invalid address data',
    INVALID_FULL_NAME: 'Invalid full name',
    INVALID_PHONE: 'Invalid phone number',
    IMAGE_NOT_FOUND: 'Image was not found',
    INVALID_PAGE: 'Invalid page number',
    INVALID_PAGE_SIZE: 'Invalid page size',
    INVALID_PRICE_RANGE: 'Invalid price range',
    INVALID_SORT: 'Invalid sort option',
    REVIEW_NOT_FOUND: 'Review was not found',
    INVALID_MODERATION_STATUS: 'Invalid review moderation status',
    INVALID_AI_REQUEST: 'Invalid AI request data',
    AI_PROVIDER_UNAVAILABLE: 'AI service is currently unavailable',
    FORBIDDEN: 'You do not have permission to perform this action',
    INTERNAL_SERVER_ERROR: 'Something went wrong. Please try again later',
  },
};

export function getApiLocale(value: string | null | undefined): ApiLocale {
  return value === 'en' ? 'en' : 'ar';
}

export function apiErrorMessage(code: ApiErrorCode, locale: string | null | undefined, detail?: string): string {
  const message = messages[getApiLocale(locale)][code];
  return detail ? `${message}: ${detail}` : message;
}

export function apiErrorResponse(
  code: ApiErrorCode,
  status: number,
  locale: string | null | undefined,
  detail?: string,
  extraHeaders?: Record<string, string>
) {
  return NextResponse.json(
    { error: apiErrorMessage(code, locale, detail), code },
    { status, headers: extraHeaders }
  );
}

export function internalServerErrorResponse(locale?: string | null) {
  return apiErrorResponse('INTERNAL_SERVER_ERROR', 500, locale);
}
