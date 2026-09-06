/**
 * AMIRA STORE - Database Seed Script (PostgreSQL compatible)
 *
 * This script recreates the complete database state from the exported data.
 * It works with both SQLite (dev) and PostgreSQL (Neon production).
 *
 * Usage:
 *   npm run db:push        # Create schema
 *   npm run db:seed:full   # Run this script to restore all data
 *
 * The script:
 *   1. Creates the admin user (with credentials supplied via environment)
 *   2. Restores all categories, products, variants, images, banners
 *   3. Restores store settings
 *   4. Restores reviews
 *
 * Images are loaded from /database/images/ directory (base64 encoded).
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
if (!ADMIN_PASSWORD || ADMIN_PASSWORD === 'CHANGE_ME_BEFORE_FIRST_SEED') {
  throw new Error('ADMIN_PASSWORD must be set to a real value before running the full seed.');
}
const adminPassword = ADMIN_PASSWORD;

const db = new PrismaClient();

// ---- Configuration ----
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '01019003677';
const STORE_WHATSAPP = process.env.STORE_WHATSAPP_NUMBER || '01019003677';

// Path to exported data (relative to project root)
const DATA_DIR = path.join(process.cwd(), 'database');
const DUMP_FILE = path.join(DATA_DIR, 'full-data-dump.json');
const IMAGES_DIR = path.join(DATA_DIR, 'images');

interface DataDump {
  user: any[];
  address: any[];
  category: any[];
  categoryTranslation: any[];
  categoryImage: any[];
  product: any[];
  productTranslation: any[];
  productImage: any[];
  productVariant: any[];
  productTag: any[];
  relatedProduct: any[];
  review: any[];
  cart: any[];
  cartItem: any[];
  wishlist: any[];
  wishlistItem: any[];
  order: any[];
  orderItem: any[];
  coupon: any[];
  banner: any[];
  storeSettings: any[];
}

function loadImageBase64(relativePath: string): { base64Data: string; mimeType: string } | null {
  const fullPath = path.join(IMAGES_DIR, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  const buffer = fs.readFileSync(fullPath);
  const ext = path.extname(fullPath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return { base64Data: buffer.toString('base64'), mimeType };
}

// Safely parse a date - returns null for invalid/missing dates
function safeDate(d: any): Date | null {
  if (!d) return null;
  const date = new Date(d);
  if (isNaN(date.getTime())) return null;
  return date;
}

// Safely parse a date with fallback
function safeDateOrNow(d: any): Date {
  return safeDate(d) || new Date();
}

async function main() {
  console.log('🌱 Starting full database seed...');

  // Load the data dump
  if (!fs.existsSync(DUMP_FILE)) {
    throw new Error(`Data dump not found at ${DUMP_FILE}. Please ensure the database/full-data-dump.json file exists.`);
  }
  const dump: DataDump = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf-8'));

  // ---- 1. Create Admin User ----
  console.log('👤 Creating admin user...');
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.user.upsert({
    where: { username: ADMIN_USERNAME },
    update: {},
    create: {
      username: ADMIN_USERNAME,
      phone: ADMIN_PHONE,
      fullName: 'Store Administrator',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`  ✓ Admin created: ${ADMIN_USERNAME}`);

  // Restore other users (customers)
  for (const u of dump.user || []) {
    if (u.username === ADMIN_USERNAME) continue;
    await db.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id: u.id,
        username: u.username,
        phone: u.phone,
        fullName: u.fullName,
        passwordHash: u.passwordHash,
        role: u.role,
        isActive: u.isActive,
        createdAt: safeDateOrNow(u.createdAt),
        updatedAt: safeDateOrNow(u.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.user.length} users`);

  // ---- 2. Store Settings ----
  console.log('⚙️ Creating store settings...');
  const settings = dump.storeSettings?.[0] || {};
  await db.storeSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      whatsappNumber: settings.whatsappNumber || STORE_WHATSAPP,
      storeNameAr: settings.storeNameAr || 'أميرا ستور',
      storeNameEn: settings.storeNameEn || 'AMIRA STORE',
      email: settings.email || null,
      addressAr: settings.addressAr || null,
      addressEn: settings.addressEn || null,
      currency: settings.currency || 'EGP',
      freeShippingEnabled: settings.freeShippingEnabled ?? true,
      freeShippingMinOrder: settings.freeShippingMinOrder ?? 1000,
      freeShippingStart: safeDate(settings.freeShippingStart),
      freeShippingEnd: safeDate(settings.freeShippingEnd),
      announcementAr: settings.announcementAr || 'شحن مجاني للطلبات فوق 1000 ج.م',
      announcementEn: settings.announcementEn || 'Free shipping on orders over EGP 1,000',
    },
  });
  console.log('  ✓ Store settings created');

  // ---- 3. Categories ----
  console.log('📂 Restoring categories...');
  for (const cat of dump.category || []) {
    await db.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        parentId: cat.parentId || null,
        slug: cat.slug,
        order: cat.order,
        isActive: cat.isActive,
        createdAt: safeDateOrNow(cat.createdAt),
        updatedAt: safeDateOrNow(cat.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.category.length} categories`);

  // Category translations
  for (const tr of dump.categoryTranslation || []) {
    await db.categoryTranslation.upsert({
      where: { categoryId_locale: { categoryId: tr.categoryId, locale: tr.locale } },
      update: {},
      create: {
        id: tr.id,
        categoryId: tr.categoryId,
        locale: tr.locale,
        name: tr.name,
        description: tr.description || null,
      },
    });
  }
  console.log(`  ✓ Restored ${dump.categoryTranslation.length} category translations`);

  // Category images (load from files)
  for (const img of dump.categoryImage || []) {
    const ext = img.mimeType === 'image/png' ? 'png' : 'jpg';
    const loaded = loadImageBase64(`categories/${img.id}.${ext}`);
    await db.categoryImage.upsert({
      where: { categoryId: img.categoryId },
      update: {},
      create: {
        id: img.id,
        categoryId: img.categoryId,
        base64Data: loaded?.base64Data ?? img.base64Data,
        mimeType: loaded?.mimeType ?? img.mimeType,
        fileSize: loaded ? fs.statSync(path.join(IMAGES_DIR, `categories/${img.id}.${ext}`)).size : img.fileSize,
        width: img.width ?? null,
        height: img.height ?? null,
        createdAt: safeDateOrNow(img.createdAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.categoryImage.length} category images`);

  // ---- 4. Products ----
  console.log('📦 Restoring products...');
  for (const p of dump.product || []) {
    await db.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        categoryId: p.categoryId,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        comparePrice: p.comparePrice ?? null,
        costPrice: p.costPrice ?? null,
        hasVariants: p.hasVariants,
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        isDeleted: p.isDeleted,
        deletedAt: p.deletedAt ? safeDate(p.deletedAt) : null,
        createdAt: safeDateOrNow(p.createdAt),
        updatedAt: safeDateOrNow(p.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.product.length} products`);

  // Product translations
  for (const tr of dump.productTranslation || []) {
    await db.productTranslation.upsert({
      where: { productId_locale: { productId: tr.productId, locale: tr.locale } },
      update: {},
      create: {
        id: tr.id,
        productId: tr.productId,
        locale: tr.locale,
        name: tr.name,
        shortDescription: tr.shortDescription || null,
        description: tr.description || null,
        metaTitle: tr.metaTitle || null,
        metaDescription: tr.metaDescription || null,
      },
    });
  }
  console.log(`  ✓ Restored ${dump.productTranslation.length} product translations`);

  // Product images (load from files)
  for (const img of dump.productImage || []) {
    const ext = img.mimeType === 'image/png' ? 'png' : 'jpg';
    const loaded = loadImageBase64(`products/${img.id}.${ext}`);
    await db.productImage.upsert({
      where: { id: img.id },
      update: {},
      create: {
        id: img.id,
        productId: img.productId,
        base64Data: loaded?.base64Data ?? img.base64Data,
        mimeType: loaded?.mimeType ?? img.mimeType,
        fileSize: loaded ? fs.statSync(path.join(IMAGES_DIR, `products/${img.id}.${ext}`)).size : img.fileSize,
        width: img.width ?? null,
        height: img.height ?? null,
        altAr: img.altAr ?? null,
        altEn: img.altEn ?? null,
        order: img.order,
        isPrimary: img.isPrimary,
        createdAt: safeDateOrNow(img.createdAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.productImage.length} product images`);

  // Product variants
  for (const v of dump.productVariant || []) {
    await db.productVariant.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        productId: v.productId,
        size: v.size || null,
        color: v.color || null,
        colorHex: v.colorHex || null,
        stock: v.stock,
        sku: v.sku ?? null,
        priceAdjustment: v.priceAdjustment ?? 0,
        createdAt: safeDateOrNow(v.createdAt),
        updatedAt: safeDateOrNow(v.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.productVariant.length} product variants`);

  // Product tags
  for (const tag of dump.productTag || []) {
    await db.productTag.upsert({
      where: { id: tag.id },
      update: {},
      create: {
        id: tag.id,
        productId: tag.productId,
        locale: tag.locale,
        tag: tag.tag,
      },
    });
  }
  console.log(`  ✓ Restored ${dump.productTag.length} product tags`);

  // ---- 5. Banners ----
  console.log('🖼️ Restoring banners...');
  for (const b of dump.banner || []) {
    const ext = b.mimeType === 'image/png' ? 'png' : 'jpg';
    const loaded = loadImageBase64(`banners/${b.id}.${ext}`);
    await db.banner.upsert({
      where: { id: b.id },
      update: {},
      create: {
        id: b.id,
        type: b.type,
        base64Data: loaded?.base64Data ?? b.base64Data,
        mimeType: loaded?.mimeType ?? b.mimeType,
        fileSize: loaded ? fs.statSync(path.join(IMAGES_DIR, `banners/${b.id}.${ext}`)).size : b.fileSize,
        titleAr: b.titleAr || null,
        titleEn: b.titleEn || null,
        subtitleAr: b.subtitleAr || null,
        subtitleEn: b.subtitleEn || null,
        ctaTextAr: b.ctaTextAr || null,
        ctaTextEn: b.ctaTextEn || null,
        ctaLink: b.ctaLink || null,
        order: b.order,
        isActive: b.isActive,
        createdAt: safeDateOrNow(b.createdAt),
        updatedAt: safeDateOrNow(b.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.banner.length} banners`);

  // ---- 6. Reviews ----
  console.log('⭐ Restoring reviews...');
  for (const r of dump.review || []) {
    await db.review.upsert({
      where: { id: r.id },
      update: {},
      create: {
        id: r.id,
        productId: r.productId,
        userId: r.userId || null,
        guestName: r.guestName,
        guestPhone: r.guestPhone || null,
        rating: r.rating,
        title: r.title || null,
        comment: r.comment || null,
        isApproved: r.isApproved,
        createdAt: safeDateOrNow(r.createdAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.review.length} reviews`);

  // ---- 7. Orders ----
  console.log('🛒 Restoring orders...');
  for (const o of dump.order || []) {
    await db.order.upsert({
      where: { id: o.id },
      update: {},
      create: {
        id: o.id,
        orderNumber: o.orderNumber,
        idempotencyKey: o.idempotencyKey || null,
        userId: o.userId || null,
        guestName: o.guestName,
        guestPhone: o.guestPhone,
        guestAddress: o.guestAddress,
        governorate: o.governorate,
        city: o.city,
        landmarks: o.landmarks || null,
        guestNotes: o.guestNotes || null,
        subtotal: o.subtotal,
        shippingCost: o.shippingCost ?? null,
        shippingStatus: o.shippingStatus,
        discount: o.discount ?? 0,
        couponCode: o.couponCode ?? null,
        total: o.total,
        status: o.status,
        createdAt: safeDateOrNow(o.createdAt),
        updatedAt: safeDateOrNow(o.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.order.length} orders`);

  // Order items
  for (const oi of dump.orderItem || []) {
    await db.orderItem.upsert({
      where: { id: oi.id },
      update: {},
      create: {
        id: oi.id,
        orderId: oi.orderId,
        productId: oi.productId,
        variantId: oi.variantId || null,
        productNameAr: oi.productNameAr,
        productNameEn: oi.productNameEn,
        productSku: oi.productSku,
        productPrice: oi.productPrice,
        productImage: typeof oi.productImage === 'string' ? oi.productImage : '',
        quantity: oi.quantity,
        stockAllocation: oi.stockAllocation || null,
      },
    });
  }
  console.log(`  ✓ Restored ${dump.orderItem.length} order items`);

  // ---- 8. Carts & Wishlists ----
  for (const c of dump.cart || []) {
    await db.cart.upsert({
      where: { id: c.id },
      update: {},
      create: {
        id: c.id,
        userId: c.userId || null,
        guestId: c.guestId || null,
        createdAt: safeDateOrNow(c.createdAt),
        updatedAt: safeDateOrNow(c.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.cart.length} carts`);

  for (const ci of dump.cartItem || []) {
    await db.cartItem.upsert({
      where: { id: ci.id },
      update: {},
      create: {
        id: ci.id,
        cartId: ci.cartId,
        productId: ci.productId,
        variantId: ci.variantId || null,
        quantity: ci.quantity,
        createdAt: safeDateOrNow(ci.createdAt),
        updatedAt: safeDateOrNow(ci.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.cartItem.length} cart items`);

  for (const w of dump.wishlist || []) {
    await db.wishlist.upsert({
      where: { id: w.id },
      update: {},
      create: {
        id: w.id,
        userId: w.userId || null,
        guestId: w.guestId || null,
        createdAt: safeDateOrNow(w.createdAt),
        updatedAt: safeDateOrNow(w.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.wishlist.length} wishlists`);

  // Wishlist items (the actual products in wishlists)
  for (const wi of dump.wishlistItem || []) {
    await db.wishlistItem.upsert({
      where: { id: wi.id },
      update: {},
      create: {
        id: wi.id,
        wishlistId: wi.wishlistId,
        productId: wi.productId,
        createdAt: safeDateOrNow(wi.createdAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.wishlistItem.length} wishlist items`);

  // ---- 9. Coupons ----
  console.log('🎟️ Restoring coupons...');
  for (const c of dump.coupon || []) {
    await db.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: {
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder || null,
        isActive: c.isActive,
        expiresAt: safeDate(c.expiresAt),
        usageLimit: c.usageLimit ?? null,
        usedCount: c.usedCount ?? 0,
        createdAt: safeDateOrNow(c.createdAt),
        updatedAt: safeDateOrNow(c.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.coupon.length} coupons`);

  // ---- 10. Related Products ----
  for (const rp of dump.relatedProduct || []) {
    await db.relatedProduct.upsert({
      where: { id: rp.id },
      update: {},
      create: {
        id: rp.id,
        productId: rp.productId,
        relatedProductId: rp.relatedProductId,
        suggestedByAI: rp.suggestedByAI ?? false,
        isApproved: rp.isApproved ?? false,
        reason: rp.reason || null,
        createdAt: safeDateOrNow(rp.createdAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.relatedProduct.length} related products`);

  // ---- 11. Addresses ----
  for (const a of dump.address || []) {
    await db.address.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id: a.id,
        userId: a.userId,
        fullName: a.fullName,
        phone: a.phone,
        street: a.street,
        city: a.city,
        governorate: a.governorate,
        landmarks: a.landmarks || null,
        isDefault: a.isDefault,
        createdAt: safeDateOrNow(a.createdAt),
        updatedAt: safeDateOrNow(a.updatedAt),
      },
    });
  }
  console.log(`  ✓ Restored ${dump.address.length} addresses`);

  console.log('\n✅ Database seed completed successfully!');
  console.log(`\n📋 Admin login user: ${ADMIN_USERNAME} (password supplied via environment)`);
  console.log(`🌐 Store: ${settings.storeNameAr || 'أميرا ستور'}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
