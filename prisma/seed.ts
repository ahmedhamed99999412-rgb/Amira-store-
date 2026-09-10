// ============================================================
// AMIRA STORE - Database Seed Script
// Creates: admin, settings, categories tree, banners, products, reviews, coupons
// All images are loaded from prisma/seed-images/ as Base64
// ============================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
  throw new Error('Refusing to run the destructive seed in production. Set ALLOW_DESTRUCTIVE_SEED=true only for an intentional reset.');
}

const prisma = new PrismaClient();
const IMAGE_DIR = path.join(process.cwd(), 'prisma', 'seed-images');

// Helper: load image as base64 with explicit field names (no spread operator)
function img(filename: string): { base64Data: string; mimeType: string; fileSize: number } {
  const filepath = path.join(IMAGE_DIR, filename);
  if (!fs.existsSync(filepath)) {
    throw new Error(`Image not found: ${filename}`);
  }
  const buf = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  return {
    base64Data: buf.toString('base64'),
    mimeType,
    fileSize: buf.length,
  };
}

// ============================================================
// SEED DATA
// ============================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
if (!ADMIN_PASSWORD || ADMIN_PASSWORD === 'CHANGE_ME_BEFORE_FIRST_SEED') {
  throw new Error('ADMIN_PASSWORD must be set to a real value before running the seed.');
}

const ADMIN = {
  username: process.env.ADMIN_USERNAME || 'admin',
  phone: process.env.ADMIN_PHONE || '01019003677',
  password: ADMIN_PASSWORD,
  fullName: 'Store Administrator',
};

const STORE_WHATSAPP = process.env.STORE_WHATSAPP_NUMBER || '01019003677';

// Category tree (full structure - 6 main + subcategories = 67 total)
const CATEGORIES = [
  {
    slug: 'women',
    image: 'cat-women.jpg',
    tr: { ar: 'نساء', en: 'Women' },
    children: [
      {
        slug: 'women-dresses',
        image: 'cat-women.jpg',
        tr: { ar: 'فساتين', en: 'Dresses' },
        children: [
          { slug: 'women-dresses-maxi', tr: { ar: 'فساتين ماكسي', en: 'Maxi Dresses' } },
          { slug: 'women-dresses-midi', tr: { ar: 'فساتين ميدي', en: 'Midi Dresses' } },
          { slug: 'women-dresses-evening', tr: { ar: 'فساتين سهرة', en: 'Evening Dresses' } },
          { slug: 'women-dresses-summer', tr: { ar: 'فساتين صيفية', en: 'Summer Dresses' } },
        ],
      },
      {
        slug: 'women-tops',
        tr: { ar: 'بلوزات وقمصان', en: 'Tops & Blouses' },
        children: [
          { slug: 'women-tops-tshirts', tr: { ar: 'تيشيرتات', en: 'T-Shirts' } },
          { slug: 'women-tops-blouses', tr: { ar: 'بلوزات', en: 'Blouses' } },
          { slug: 'women-tops-sweaters', tr: { ar: 'كنزات', en: 'Sweaters' } },
        ],
      },
      {
        slug: 'women-bottoms',
        tr: { ar: 'بناطيل وتنانير', en: 'Bottoms' },
        children: [
          { slug: 'women-bottoms-jeans', tr: { ar: 'جينز', en: 'Jeans' } },
          { slug: 'women-bottoms-trousers', tr: { ar: 'بناطيل', en: 'Trousers' } },
          { slug: 'women-bottoms-skirts', tr: { ar: 'تنانير', en: 'Skirts' } },
        ],
      },
      {
        slug: 'women-shoes',
        tr: { ar: 'أحذية', en: 'Shoes' },
        children: [
          { slug: 'women-shoes-heels', tr: { ar: 'كعب عالي', en: 'Heels' } },
          { slug: 'women-shoes-flats', tr: { ar: 'مسطحة', en: 'Flats' } },
          { slug: 'women-shoes-sneakers', tr: { ar: 'رياضي', en: 'Sneakers' } },
        ],
      },
      {
        slug: 'women-bags',
        tr: { ar: 'حقائب', en: 'Bags' },
        children: [
          { slug: 'women-bags-handbags', tr: { ar: 'حقائب يد', en: 'Handbags' } },
          { slug: 'women-bags-clutches', tr: { ar: 'كلاتش', en: 'Clutches' } },
        ],
      },
    ],
  },
  {
    slug: 'men',
    image: 'cat-men.jpg',
    tr: { ar: 'رجال', en: 'Men' },
    children: [
      {
        slug: 'men-shirts',
        tr: { ar: 'قمصان', en: 'Shirts' },
        children: [
          { slug: 'men-shirts-tshirts', tr: { ar: 'تيشيرتات', en: 'T-Shirts' } },
          { slug: 'men-shirts-polo', tr: { ar: 'بولو', en: 'Polo Shirts' } },
          { slug: 'men-shirts-dress', tr: { ar: 'قمصان رسمية', en: 'Dress Shirts' } },
        ],
      },
      {
        slug: 'men-pants',
        tr: { ar: 'بناطيل', en: 'Pants' },
        children: [
          { slug: 'men-pants-jeans', tr: { ar: 'جينز', en: 'Jeans' } },
          { slug: 'men-pants-trousers', tr: { ar: 'بناطيل', en: 'Trousers' } },
          { slug: 'men-pants-chinos', tr: { ar: 'شينو', en: 'Chinos' } },
        ],
      },
      {
        slug: 'men-outerwear',
        tr: { ar: 'ملابس خارجية', en: 'Outerwear' },
        children: [
          { slug: 'men-outerwear-jackets', tr: { ar: 'جاكيتات', en: 'Jackets' } },
          { slug: 'men-outerwear-blazers', tr: { ar: 'بليزر', en: 'Blazers' } },
        ],
      },
      {
        slug: 'men-shoes',
        tr: { ar: 'أحذية', en: 'Shoes' },
        children: [
          { slug: 'men-shoes-sneakers', tr: { ar: 'رياضي', en: 'Sneakers' } },
          { slug: 'men-shoes-formal', tr: { ar: 'رسمي', en: 'Formal Shoes' } },
        ],
      },
      {
        slug: 'men-accessories',
        tr: { ar: 'إكسسوارات', en: 'Accessories' },
        children: [
          { slug: 'men-accessories-watches', tr: { ar: 'ساعات', en: 'Watches' } },
          { slug: 'men-accessories-belts', tr: { ar: 'أحزمة', en: 'Belts' } },
        ],
      },
    ],
  },
  {
    slug: 'kids',
    image: 'cat-kids.jpg',
    tr: { ar: 'أطفال', en: 'Kids' },
    children: [
      {
        slug: 'kids-girls',
        tr: { ar: 'بنات', en: 'Girls' },
        children: [
          { slug: 'kids-girls-dresses', tr: { ar: 'فساتين', en: 'Dresses' } },
          { slug: 'kids-girls-tops', tr: { ar: 'بلوزات', en: 'Tops' } },
        ],
      },
      {
        slug: 'kids-boys',
        tr: { ar: 'أولاد', en: 'Boys' },
        children: [
          { slug: 'kids-boys-tops', tr: { ar: 'تيشيرتات', en: 'Tops' } },
          { slug: 'kids-boys-bottoms', tr: { ar: 'بناطيل', en: 'Bottoms' } },
        ],
      },
    ],
  },
  {
    slug: 'baby',
    image: 'cat-baby.jpg',
    tr: { ar: 'حديثي الولادة', en: 'Baby' },
    children: [
      { slug: 'baby-onesies', tr: { ar: 'بادي وملاس', en: 'Onesies & Bodysuits' } },
      { slug: 'baby-sleepwear', tr: { ar: 'ملابس نوم', en: 'Sleepwear' } },
      { slug: 'baby-sets', tr: { ar: 'أطقم', en: 'Sets' } },
    ],
  },
  {
    slug: 'beauty',
    image: 'cat-beauty.jpg',
    tr: { ar: 'جمال وعناية', en: 'Beauty' },
    children: [
      {
        slug: 'beauty-skincare',
        tr: { ar: 'العناية بالبشرة', en: 'Skincare' },
        children: [
          { slug: 'beauty-skincare-cleansers', tr: { ar: 'منظفات', en: 'Cleansers' } },
          { slug: 'beauty-skincare-moisturizers', tr: { ar: 'مرطبات', en: 'Moisturizers' } },
          { slug: 'beauty-skincare-serums', tr: { ar: 'سيروم', en: 'Serums' } },
        ],
      },
      {
        slug: 'beauty-makeup',
        tr: { ar: 'مكياج', en: 'Makeup' },
        children: [
          { slug: 'beauty-makeup-lips', tr: { ar: 'شفاه', en: 'Lips' } },
          { slug: 'beauty-makeup-eyes', tr: { ar: 'عيون', en: 'Eyes' } },
          { slug: 'beauty-makeup-face', tr: { ar: 'وجه', en: 'Face' } },
        ],
      },
      {
        slug: 'beauty-haircare',
        tr: { ar: 'العناية بالشعر', en: 'Haircare' },
        children: [
          { slug: 'beauty-haircare-shampoo', tr: { ar: 'شامبو', en: 'Shampoo' } },
          { slug: 'beauty-haircare-treatments', tr: { ar: 'علاجات', en: 'Treatments' } },
        ],
      },
    ],
  },
  {
    slug: 'fragrance',
    image: 'cat-fragrance.jpg',
    tr: { ar: 'عطور', en: 'Fragrance' },
    children: [
      { slug: 'fragrance-women', tr: { ar: 'عطور نسائية', en: "Women's Perfumes" } },
      { slug: 'fragrance-men', tr: { ar: 'عطور رجالية', en: "Men's Colognes" } },
      { slug: 'fragrance-unisex', tr: { ar: 'للجنسين', en: 'Unisex Fragrances' } },
      { slug: 'fragrance-gift-sets', tr: { ar: 'أطقم هدايا', en: 'Gift Sets' } },
    ],
  },
];

// Banners (3 hero + 2 promo)
const BANNERS = [
  { type: 'HERO', image: 'hero1.jpg', order: 0, titleAr: 'موسم جديد', titleEn: 'New Season', subtitleAr: 'تشكيلات جديدة مخصصة لك', subtitleEn: 'New Collections Just For You', ctaTextAr: 'تسوق الآن', ctaTextEn: 'Shop Now', ctaLink: '/shop' },
  { type: 'HERO', image: 'hero2.jpg', order: 1, titleAr: 'تخفيضات الصيف', titleEn: 'Summer Sale', subtitleAr: 'اكتشف أحدث صيحات الموضة', subtitleEn: 'Discover the Latest Trends', ctaTextAr: 'تسوق الآن', ctaTextEn: 'Shop Now', ctaLink: '/shop' },
  { type: 'HERO', image: 'hero3.jpg', order: 2, titleAr: 'أناقة لا تُضاهى', titleEn: 'Unmatched Elegance', subtitleAr: 'تشكيلة فاخرة من أفضل الماركات', subtitleEn: 'Premium Collection from Top Brands', ctaTextAr: 'تسوق الآن', ctaTextEn: 'Shop Now', ctaLink: '/shop' },
  { type: 'PROMO', image: 'promo-beauty.jpg', order: 0, titleAr: 'الجمال', titleEn: 'Beauty', subtitleAr: 'تألقي كل يوم', subtitleEn: 'Glow Everyday', ctaTextAr: 'تسوق الجمال', ctaTextEn: 'Shop Beauty', ctaLink: '/category/beauty' },
  { type: 'PROMO', image: 'promo-kids.jpg', order: 1, titleAr: 'تشكيلة الأطفال', titleEn: 'Kids Collection', subtitleAr: 'العب بأناقة', subtitleEn: 'Play in Style', ctaTextAr: 'تسوق للأطفال', ctaTextEn: 'Shop Kids', ctaLink: '/category/kids' },
];

type SeedProduct = {
  slug: string;
  sku: string;
  categorySlug: string;
  price: number;
  comparePrice?: number;
  costPrice?: number;
  hasVariants: boolean;
  isFeatured: boolean;
  images: string[];
  tr: { ar: { name: string; short: string; desc: string }; en: { name: string; short: string; desc: string } };
  variants?: { size?: string; color?: string; colorHex?: string; stock: number; sku?: string; priceAdjustment?: number }[];
  tags: { ar: string[]; en: string[] };
};

const PRODUCTS: SeedProduct[] = [
  // ===== WOMEN (6 products) =====
  {
    slug: 'floral-midi-dress',
    sku: 'WD-001',
    categorySlug: 'women-dresses-midi',
    price: 1599,
    comparePrice: 2000,
    costPrice: 800,
    hasVariants: true,
    isFeatured: true,
    images: ['p-dress1.jpg'],
    tr: {
      ar: { name: 'فستان ميدي فلورال', short: 'فستان أنيق بتصميم زهري مثالي للمناسبات', desc: 'اكتشفي الأناقة الصيفية مع فستان ميدي فلورال من AMIRA STORE. مصنوع من قماش قطني ناعم ومريح، يتميز بتصميم زهري راقي وأكمام قصيرة. مثالي للمناسبات اليومية والخروجات الصيفية. القصّة الميدي تمنحكِ إطلالة أنثوية راقية.' },
      en: { name: 'Floral Midi Dress', short: 'Elegant floral dress perfect for occasions', desc: 'Discover summer elegance with the Floral Midi Dress from AMIRA STORE. Made from soft and comfortable cotton fabric, featuring an elegant floral design and short sleeves. Perfect for everyday occasions and summer outings. The midi cut gives you a refined feminine look.' },
    },
    variants: [
      { size: 'S', color: 'وردي', colorHex: '#F4C2C2', stock: 10, sku: 'WD-001-S-P' },
      { size: 'M', color: 'وردي', colorHex: '#F4C2C2', stock: 15, sku: 'WD-001-M-P' },
      { size: 'L', color: 'وردي', colorHex: '#F4C2C2', stock: 8, sku: 'WD-001-L-P' },
      { size: 'M', color: 'أسود', colorHex: '#1A1A1A', stock: 12, sku: 'WD-001-M-B' },
    ],
    tags: { ar: ['صيفي', 'مناسبات', 'قطن'], en: ['summer', 'occasions', 'cotton'] },
  },
  {
    slug: 'elegant-evening-dress',
    sku: 'WD-002',
    categorySlug: 'women-dresses-evening',
    price: 2499,
    comparePrice: 3000,
    costPrice: 1200,
    hasVariants: true,
    isFeatured: true,
    images: ['p-dress2.jpg'],
    tr: {
      ar: { name: 'فستان سهرة أنيق', short: 'فستان سهرة فاخر للحفلات والمناسبات الخاصة', desc: 'تألقي في مناسباتك الخاصة مع فستان السهرة الأنيق من AMIRA STORE. تصميم راقٍ يبرز جمالك، مصنوع من أجود الأقمشة. مثالي للحفلات والزفاف والمناسبات الرسمية.' },
      en: { name: 'Elegant Evening Dress', short: 'Luxurious evening dress for special occasions', desc: 'Shine at your special occasions with the Elegant Evening Dress from AMIRA STORE. A refined design that highlights your beauty, made from the finest fabrics. Perfect for parties, weddings, and formal events.' },
    },
    variants: [
      { size: 'S', color: 'أحمر', colorHex: '#C8102E', stock: 5, sku: 'WD-002-S-R' },
      { size: 'M', color: 'أحمر', colorHex: '#C8102E', stock: 7, sku: 'WD-002-M-R' },
      { size: 'L', color: 'أحمر', colorHex: '#C8102E', stock: 4, sku: 'WD-002-L-R' },
    ],
    tags: { ar: ['سهرة', 'مناسبات', 'فاخر'], en: ['evening', 'occasions', 'luxury'] },
  },
  {
    slug: 'classic-white-blouse',
    sku: 'WT-001',
    categorySlug: 'women-tops-blouses',
    price: 699,
    costPrice: 350,
    hasVariants: true,
    isFeatured: true,
    images: ['p-top1.jpg'],
    tr: {
      ar: { name: 'بلوزة بيضاء كلاسيكية', short: 'بلوزة أنيقة مناسبة للعمل والمناسبات', desc: 'بلوزة بيضاء كلاسيكية من AMIRA STORE. تصميم خالد يناسب جميع الإطلالات، من العمل إلى المناسبات. مصنوعة من قماش عالي الجودة يمنحكِ راحة طوال اليوم.' },
      en: { name: 'Classic White Blouse', short: 'Elegant blouse for work and occasions', desc: 'Classic white blouse from AMIRA STORE. A timeless design that suits all looks, from work to occasions. Made from high-quality fabric that gives you comfort all day long.' },
    },
    variants: [
      { size: 'S', stock: 20, sku: 'WT-001-S' },
      { size: 'M', stock: 25, sku: 'WT-001-M' },
      { size: 'L', stock: 15, sku: 'WT-001-L' },
      { size: 'XL', stock: 10, sku: 'WT-001-XL' },
    ],
    tags: { ar: ['كلاسيك', 'عمل', 'أبيض'], en: ['classic', 'work', 'white'] },
  },
  {
    slug: 'slim-fit-jeans',
    sku: 'WB-001',
    categorySlug: 'women-bottoms-jeans',
    price: 899,
    comparePrice: 1100,
    costPrice: 450,
    hasVariants: true,
    isFeatured: false,
    images: ['p-jeans1.jpg'],
    tr: {
      ar: { name: 'جينز سليم فيت', short: 'جينز عصري بقصة ضيقة مريحة', desc: 'جينز سليم فيت من AMIRA STORE. قصة عصرية مريحة تبرز جمالك. مصنوع من دنيم مرن عالي الجودة. مثالي للإطلالات اليومية الكاجوال.' },
      en: { name: 'Slim Fit Jeans', short: 'Modern slim-cut comfortable jeans', desc: 'Slim Fit Jeans from AMIRA STORE. A modern comfortable cut that highlights your beauty. Made from high-quality stretchy denim. Perfect for casual everyday looks.' },
    },
    variants: [
      { size: '36', color: 'أزرق', colorHex: '#4A6FA5', stock: 12, sku: 'WB-001-36-B' },
      { size: '38', color: 'أزرق', colorHex: '#4A6FA5', stock: 18, sku: 'WB-001-38-B' },
      { size: '40', color: 'أزرق', colorHex: '#4A6FA5', stock: 14, sku: 'WB-001-40-B' },
    ],
    tags: { ar: ['كاجوال', 'جينز', 'يومي'], en: ['casual', 'denim', 'daily'] },
  },
  {
    slug: 'elegant-heels',
    sku: 'WS-001',
    categorySlug: 'women-shoes-heels',
    price: 1299,
    costPrice: 600,
    hasVariants: true,
    isFeatured: true,
    images: ['p-shoes1.jpg'],
    tr: {
      ar: { name: 'حذاء كعب أنيق', short: 'حذاء كعب عالي راقي للمناسبات', desc: 'حذاء كعب أنيق من AMIRA STORE. تصميم راقٍ يضيف لمسة من الفخامة لإطلالتك. مريح رغم الكعب العالي بفضل التصميم المدروس. مثالي للمناسبات والسهرات.' },
      en: { name: 'Elegant Heels', short: 'Refined high heels for occasions', desc: 'Elegant heels from AMIRA STORE. A refined design that adds a touch of luxury to your look. Comfortable despite the high heel thanks to the studied design. Perfect for occasions and evenings.' },
    },
    variants: [
      { size: '37', color: 'أسود', colorHex: '#1A1A1A', stock: 8, sku: 'WS-001-37-BK' },
      { size: '38', color: 'أسود', colorHex: '#1A1A1A', stock: 10, sku: 'WS-001-38-BK' },
      { size: '39', color: 'أسود', colorHex: '#1A1A1A', stock: 6, sku: 'WS-001-39-BK' },
      { size: '40', color: 'أسود', colorHex: '#1A1A1A', stock: 4, sku: 'WS-001-40-BK' },
    ],
    tags: { ar: ['كعب', 'مناسبات', 'فاخر'], en: ['heels', 'occasions', 'luxury'] },
  },
  {
    slug: 'leather-handbag',
    sku: 'WB-002',
    categorySlug: 'women-bags-handbags',
    price: 1799,
    comparePrice: 2200,
    costPrice: 900,
    hasVariants: true,
    isFeatured: true,
    images: ['p-bag1.jpg'],
    tr: {
      ar: { name: 'حقيبة يد جلدية', short: 'حقيبة يد فاخرة من الجلد الطبيعي', desc: 'حقيبة يد جلدية فاخرة من AMIRA STORE. مصنوعة من جلد طبيعي عالي الجودة بتصميم أنيق وعملي. مساحة داخلية واسعة مع جيوب متعددة. مثالية للعمل والخروجات.' },
      en: { name: 'Leather Handbag', short: 'Luxurious handbag made of genuine leather', desc: 'Luxurious leather handbag from AMIRA STORE. Made from high-quality genuine leather with an elegant and practical design. Spacious interior with multiple pockets. Perfect for work and outings.' },
    },
    variants: [
      { color: 'بني', colorHex: '#8B4513', stock: 15, sku: 'WB-002-BR' },
      { color: 'أسود', colorHex: '#1A1A1A', stock: 20, sku: 'WB-002-BK' },
    ],
    tags: { ar: ['جلد', 'حقيبة', 'فاخر'], en: ['leather', 'bag', 'luxury'] },
  },
  // ===== MEN (5 products) =====
  {
    slug: 'classic-polo-shirt',
    sku: 'MS-001',
    categorySlug: 'men-shirts-polo',
    price: 549,
    costPrice: 280,
    hasVariants: true,
    isFeatured: true,
    images: ['p-mshirt1.jpg'],
    tr: {
      ar: { name: 'تيشيرت بولو كلاسيك', short: 'تيشيرت بولو أنيق للرجال', desc: 'تيشيرت بولو كلاسيك من AMIRA STORE. تصميم خالد يناسب جميع الإطلالات. مصنوع من قطن بيكية عالي الجودة. مريح وأنيق للإطلالات اليومية والكاجوال.' },
      en: { name: 'Classic Polo Shirt', short: 'Elegant polo shirt for men', desc: 'Classic Polo Shirt from AMIRA STORE. A timeless design that suits all looks. Made from high-quality pique cotton. Comfortable and elegant for everyday and casual looks.' },
    },
    variants: [
      { size: 'M', color: 'كحلي', colorHex: '#1B2A4A', stock: 18, sku: 'MS-001-M-NV' },
      { size: 'L', color: 'كحلي', colorHex: '#1B2A4A', stock: 22, sku: 'MS-001-L-NV' },
      { size: 'XL', color: 'كحلي', colorHex: '#1B2A4A', stock: 15, sku: 'MS-001-XL-NV' },
      { size: 'M', color: 'أبيض', colorHex: '#FFFFFF', stock: 20, sku: 'MS-001-M-WH' },
      { size: 'L', color: 'أبيض', colorHex: '#FFFFFF', stock: 17, sku: 'MS-001-L-WH' },
    ],
    tags: { ar: ['بولو', 'كاجوال', 'قطن'], en: ['polo', 'casual', 'cotton'] },
  },
  {
    slug: 'mens-slim-jeans',
    sku: 'MP-001',
    categorySlug: 'men-pants-jeans',
    price: 999,
    comparePrice: 1300,
    costPrice: 500,
    hasVariants: true,
    isFeatured: false,
    images: ['p-mjeans1.jpg'],
    tr: {
      ar: { name: 'جينز رجالي سليم', short: 'جينز رجالي بقصة سليم عصرية', desc: 'جينز رجالي سليم من AMIRA STORE. قصة عصرية مريحة تمنحك إطلالة أنيقة. مصنوع من دنيم مرن عالي الجودة. مثالي للإطلالات اليومية.' },
      en: { name: "Men's Slim Jeans", short: "Modern slim-cut men's jeans", desc: "Men's Slim Jeans from AMIRA STORE. A modern comfortable cut that gives you an elegant look. Made from high-quality stretchy denim. Perfect for everyday looks." },
    },
    variants: [
      { size: '32', color: 'أزرق غامق', colorHex: '#2B3A67', stock: 14, sku: 'MP-001-32-DB' },
      { size: '34', color: 'أزرق غامق', colorHex: '#2B3A67', stock: 16, sku: 'MP-001-34-DB' },
      { size: '36', color: 'أزرق غامق', colorHex: '#2B3A67', stock: 10, sku: 'MP-001-36-DB' },
    ],
    tags: { ar: ['جينز', 'كاجوال', 'يومي'], en: ['denim', 'casual', 'daily'] },
  },
  {
    slug: 'mens-sneakers',
    sku: 'MSH-001',
    categorySlug: 'men-shoes-sneakers',
    price: 1399,
    costPrice: 700,
    hasVariants: true,
    isFeatured: true,
    images: ['p-mshoes1.jpg'],
    tr: {
      ar: { name: 'حذاء رياضي رجالي', short: 'حذاء رياضي مريح وعصري', desc: 'حذاء رياضي رجالي من AMIRA STORE. تصميم عصري مريح يناسب الإطلالات الكاجوال. مصنوع من مواد عالية الجودة توفر راحة طوال اليوم. نعل مرن مضاد للانزلاق.' },
      en: { name: "Men's Sneakers", short: 'Comfortable and modern sneakers', desc: "Men's Sneakers from AMIRA STORE. A modern comfortable design that suits casual looks. Made from high-quality materials that provide all-day comfort. Flexible anti-slip sole." },
    },
    variants: [
      { size: '41', color: 'أبيض', colorHex: '#FFFFFF', stock: 12, sku: 'MSH-001-41-WH' },
      { size: '42', color: 'أبيض', colorHex: '#FFFFFF', stock: 15, sku: 'MSH-001-42-WH' },
      { size: '43', color: 'أبيض', colorHex: '#FFFFFF', stock: 10, sku: 'MSH-001-43-WH' },
      { size: '44', color: 'أبيض', colorHex: '#FFFFFF', stock: 8, sku: 'MSH-001-44-WH' },
    ],
    tags: { ar: ['رياضي', 'كاجوال', 'مريح'], en: ['sport', 'casual', 'comfortable'] },
  },
  {
    slug: 'luxury-watch',
    sku: 'MA-001',
    categorySlug: 'men-accessories-watches',
    price: 2999,
    comparePrice: 3500,
    costPrice: 1500,
    hasVariants: false,
    isFeatured: true,
    images: ['p-mwatch1.jpg'],
    tr: {
      ar: { name: 'ساعة فاخرة', short: 'ساعة يد رجالية فاخرة بتصميم كلاسيكي', desc: 'ساعة فاخرة من AMIRA STORE. تصميم كلاسيكي خالد يضيف لمسة من الأناقة لإطلالتك. حركة كوارتز دقيقة، مقاومة للماء. مثالية للمناسبات الرسمية واليومية.' },
      en: { name: 'Luxury Watch', short: "Luxurious men's wristwatch with classic design", desc: 'Luxury Watch from AMIRA STORE. A timeless classic design that adds a touch of elegance to your look. Precise quartz movement, water resistant. Perfect for formal and daily occasions.' },
    },
    variants: [{ stock: 25, sku: 'MA-001' }],
    tags: { ar: ['ساعة', 'فاخر', 'كلاسيك'], en: ['watch', 'luxury', 'classic'] },
  },
  {
    slug: 'mens-leather-jacket',
    sku: 'MJ-001',
    categorySlug: 'men-outerwear-jackets',
    price: 2199,
    comparePrice: 2700,
    costPrice: 1100,
    hasVariants: true,
    isFeatured: false,
    images: ['p-mjacket1.jpg'],
    tr: {
      ar: { name: 'جاكيت جلد رجالي', short: 'جاكيت جلد طبيعي بتصميم عصري', desc: 'جاكيت جلد رجالي من AMIRA STORE. مصنوع من جلد طبيعي فاخر بتصميم عصري أنيق. بطانة داخلية دافئة. مثالي لإطلالات الخريف والشتاء.' },
      en: { name: "Men's Leather Jacket", short: 'Genuine leather jacket with modern design', desc: "Men's Leather Jacket from AMIRA STORE. Made from premium genuine leather with an elegant modern design. Warm inner lining. Perfect for fall and winter looks." },
    },
    variants: [
      { size: 'M', color: 'بني', colorHex: '#8B4513', stock: 8, sku: 'MJ-001-M-BR' },
      { size: 'L', color: 'بني', colorHex: '#8B4513', stock: 10, sku: 'MJ-001-L-BR' },
      { size: 'XL', color: 'بني', colorHex: '#8B4513', stock: 6, sku: 'MJ-001-XL-BR' },
    ],
    tags: { ar: ['جلد', 'جاكيت', 'شتاء'], en: ['leather', 'jacket', 'winter'] },
  },
  // ===== KIDS (2 products) =====
  {
    slug: 'kids-summer-dress',
    sku: 'KG-001',
    categorySlug: 'kids-girls-dresses',
    price: 449,
    costPrice: 220,
    hasVariants: true,
    isFeatured: true,
    images: ['p-kids1.jpg'],
    tr: {
      ar: { name: 'فستان صيفي للأطفال', short: 'فستان أنيق ومريح للبنات', desc: 'فستان صيفي للأطفال من AMIRA STORE. تصميم لطيف ومريح. مصنوع من قماش قطني ناعم. مثالي للأيام الصيفية والمناسبات.' },
      en: { name: "Kids' Summer Dress", short: 'Elegant and comfortable dress for girls', desc: "Kids' Summer Dress from AMIRA STORE. A lovely and comfortable design. Made from soft cotton fabric. Perfect for summer days and occasions." },
    },
    variants: [
      { size: '4-5 سنوات', color: 'وردي', colorHex: '#F4C2C2', stock: 12, sku: 'KG-001-4-P' },
      { size: '6-7 سنوات', color: 'وردي', colorHex: '#F4C2C2', stock: 10, sku: 'KG-001-6-P' },
      { size: '8-9 سنوات', color: 'وردي', colorHex: '#F4C2C2', stock: 8, sku: 'KG-001-8-P' },
    ],
    tags: { ar: ['أطفال', 'صيفي', 'بنات'], en: ['kids', 'summer', 'girls'] },
  },
  {
    slug: 'kids-casual-outfit',
    sku: 'KB-001',
    categorySlug: 'kids-boys-tops',
    price: 349,
    comparePrice: 450,
    costPrice: 170,
    hasVariants: true,
    isFeatured: false,
    images: ['p-kids2.jpg'],
    tr: {
      ar: { name: 'طقم كاجوال للأولاد', short: 'طقم مريح وعصري للأولاد', desc: 'طقم كاجوال للأولاد من AMIRA STORE. تصميم عملي ومريح للحركة. ألوان زاهية وأنيقة. مثالي للعب والمدرسة.' },
      en: { name: "Boys' Casual Outfit", short: 'Comfortable and modern outfit for boys', desc: "Boys' Casual Outfit from AMIRA STORE. A practical and comfortable design for movement. Bright and elegant colors. Perfect for play and school." },
    },
    variants: [
      { size: '4-5 سنوات', stock: 15, sku: 'KB-001-4' },
      { size: '6-7 سنوات', stock: 12, sku: 'KB-001-6' },
      { size: '8-9 سنوات', stock: 10, sku: 'KB-001-8' },
    ],
    tags: { ar: ['أولاد', 'كاجوال', 'يومي'], en: ['boys', 'casual', 'daily'] },
  },
  // ===== BABY (2 products) =====
  {
    slug: 'baby-onesie-set',
    sku: 'BB-001',
    categorySlug: 'baby-onesies',
    price: 199,
    costPrice: 90,
    hasVariants: true,
    isFeatured: true,
    images: ['p-baby1.jpg'],
    tr: {
      ar: { name: 'طقم بادي للأطفال', short: 'بادي قطني ناعم لحديثي الولادة', desc: 'طقم بادي للأطفال من AMIRA STORE. مصنوع من قطن ناعم 100% لحساسية بشرة الأطفال. تصميم عملي سهل اللبس. ألوان هادئة وجميلة.' },
      en: { name: 'Baby Onesie Set', short: 'Soft cotton onesie for newborns', desc: 'Baby Onesie Set from AMIRA STORE. Made from 100% soft cotton for baby skin sensitivity. Practical easy-to-wear design. Calm and beautiful colors.' },
    },
    variants: [
      { size: '0-3 شهر', color: 'أبيض', colorHex: '#FFFFFF', stock: 20, sku: 'BB-001-0-WH' },
      { size: '3-6 شهر', color: 'أبيض', colorHex: '#FFFFFF', stock: 18, sku: 'BB-001-3-WH' },
      { size: '6-12 شهر', color: 'أبيض', colorHex: '#FFFFFF', stock: 15, sku: 'BB-001-6-WH' },
    ],
    tags: { ar: ['أطفال', 'بادي', 'قطن'], en: ['baby', 'onesie', 'cotton'] },
  },
  {
    slug: 'baby-sleepwear',
    sku: 'BB-002',
    categorySlug: 'baby-sleepwear',
    price: 249,
    comparePrice: 320,
    costPrice: 110,
    hasVariants: false,
    isFeatured: false,
    images: ['p-baby2.jpg'],
    tr: {
      ar: { name: 'بيجامة أطفال', short: 'ملابس نوم مريحة للأطفال', desc: 'بيجامة أطفال من AMIRA STORE. مصنوعة من قماش ناعم ودافئ. تصميم مريح لنوم هانئ. ألوان لطيفة ومناسبة.' },
      en: { name: 'Baby Sleepwear', short: 'Comfortable sleepwear for babies', desc: 'Baby Sleepwear from AMIRA STORE. Made from soft and warm fabric. Comfortable design for peaceful sleep. Lovely and suitable colors.' },
    },
    variants: [{ stock: 30, sku: 'BB-002' }],
    tags: { ar: ['أطفال', 'نوم', 'مريح'], en: ['baby', 'sleep', 'comfortable'] },
  },
  // ===== BEAUTY (3 products) =====
  {
    slug: 'matte-lipstick',
    sku: 'BM-001',
    categorySlug: 'beauty-makeup-lips',
    price: 299,
    costPrice: 130,
    hasVariants: true,
    isFeatured: true,
    images: ['p-beauty1.jpg'],
    tr: {
      ar: { name: 'أحمر شفاه مطفي', short: 'أحمر شفاه مطفي يدوم طويلاً', desc: 'أحمر شفاه مطفي من AMIRA STORE. تركيبة غنية تدوم طويلاً. لون مكثف وغير متTRANSFER. يمنح شفاهك مظهراً فاخراً. متوفر بألوان متعددة.' },
      en: { name: 'Matte Lipstick', short: 'Long-lasting matte lipstick', desc: 'Matte Lipstick from AMIRA STORE. Rich long-lasting formula. Intense and non-transfer color. Gives your lips a luxurious look. Available in multiple colors.' },
    },
    variants: [
      { color: 'أحمر', colorHex: '#C8102E', stock: 25, sku: 'BM-001-R' },
      { color: 'وردي', colorHex: '#E91E63', stock: 30, sku: 'BM-001-P' },
      { color: 'خمري', colorHex: '#800020', stock: 20, sku: 'BM-001-BG' },
      { color: 'عنابي', colorHex: '#660000', stock: 15, sku: 'BM-001-M' },
    ],
    tags: { ar: ['مكياج', 'شفاه', 'مطفي'], en: ['makeup', 'lips', 'matte'] },
  },
  {
    slug: 'facial-serum',
    sku: 'BS-001',
    categorySlug: 'beauty-skincare-serums',
    price: 599,
    comparePrice: 750,
    costPrice: 280,
    hasVariants: false,
    isFeatured: true,
    images: ['p-beauty2.jpg'],
    tr: {
      ar: { name: 'سيروم وجه بفيتامين C', short: 'سيروم مضاد للأكسدة لبشرة مشرقة', desc: 'سيروم وجه بفيتامين C من AMIRA STORE. تركيبة قوية مضادة للأكسدة. تفتح البشرة وتوحد لونها. تقلل من علامات التقدّم في السن. مناسب لجميع أنواع البشرة.' },
      en: { name: 'Vitamin C Facial Serum', short: 'Antioxidant serum for radiant skin', desc: 'Vitamin C Facial Serum from AMIRA STORE. Powerful anti-oxidant formula. Brightens and evens skin tone. Reduces signs of aging. Suitable for all skin types.' },
    },
    variants: [{ stock: 40, sku: 'BS-001' }],
    tags: { ar: ['عناية', 'سيروم', 'فيتامين'], en: ['skincare', 'serum', 'vitamin'] },
  },
  {
    slug: 'moisturizing-cream',
    sku: 'BS-002',
    categorySlug: 'beauty-skincare-moisturizers',
    price: 399,
    costPrice: 180,
    hasVariants: false,
    isFeatured: false,
    images: ['p-beauty3.jpg'],
    tr: {
      ar: { name: 'كريم مرطب للوجه', short: 'مرطب غني للبشرة الجافة', desc: 'كريم مرطب للوجه من AMIRA STORE. تركيبة غنية بالأحماض الدهنية. يرطب البشرة بعمق ويحافظ على نعومتها. يدوم 24 ساعة. مناسب للبشرة الجافة والعادية.' },
      en: { name: 'Face Moisturizing Cream', short: 'Rich moisturizer for dry skin', desc: 'Face Moisturizing Cream from AMIRA STORE. Rich formula with fatty acids. Deeply moisturizes and maintains skin softness. Lasts 24 hours. Suitable for dry and normal skin.' },
    },
    variants: [{ stock: 35, sku: 'BS-002' }],
    tags: { ar: ['عناية', 'مرطب', 'وجه'], en: ['skincare', 'moisturizer', 'face'] },
  },
  // ===== FRAGRANCE (3 products) =====
  {
    slug: 'eau-de-parfum-women',
    sku: 'FW-001',
    categorySlug: 'fragrance-women',
    price: 1899,
    comparePrice: 2400,
    costPrice: 950,
    hasVariants: false,
    isFeatured: true,
    images: ['p-perfume1.jpg'],
    tr: {
      ar: { name: 'عطر نسائي فاخر', short: 'عطر شرقي زهري أنيق للمرأة', desc: 'عطر نسائي فاخر من AMIRA STORE. مزيج راقٍ من الزهور الشرقية والفواكه. يدوم طويلاً مع ثبات عالٍ. عبوة أنيقة 100 مل. مثالي للاستخدام اليومي والمناسبات.' },
      en: { name: "Women's Eau de Parfum", short: 'Elegant oriental floral fragrance for women', desc: "Women's Eau de Parfum from AMIRA STORE. A refined blend of oriental flowers and fruits. Long-lasting with high sillage. Elegant 100ml bottle. Perfect for daily use and occasions." },
    },
    variants: [{ stock: 30, sku: 'FW-001' }],
    tags: { ar: ['عطر', 'نسائي', 'فاخر'], en: ['perfume', 'women', 'luxury'] },
  },
  {
    slug: 'mens-cologne',
    sku: 'FM-001',
    categorySlug: 'fragrance-men',
    price: 1699,
    costPrice: 850,
    hasVariants: false,
    isFeatured: true,
    images: ['p-perfume2.jpg'],
    tr: {
      ar: { name: 'كولون رجالي', short: 'عطر خشبي عطري قوي للرجل', desc: 'كولون رجالي من AMIRA STORE. مزيج قوي من الأخشاب والتبغ والجلد. عطر جريء ورجولي يدوم طويلاً. عبوة 100 مل. مثالي للرجل الواثق.' },
      en: { name: "Men's Cologne", short: 'Strong woody aromatic fragrance for men', desc: "Men's Cologne from AMIRA STORE. A powerful blend of woods, tobacco, and leather. A bold and masculine long-lasting fragrance. 100ml bottle. Perfect for the confident man." },
    },
    variants: [{ stock: 28, sku: 'FM-001' }],
    tags: { ar: ['عطر', 'رجالي', 'خشبي'], en: ['cologne', 'men', 'woody'] },
  },
  {
    slug: 'unisex-fragrance',
    sku: 'FU-001',
    categorySlug: 'fragrance-unisex',
    price: 2099,
    comparePrice: 2600,
    costPrice: 1050,
    hasVariants: false,
    isFeatured: false,
    images: ['p-perfume3.jpg'],
    tr: {
      ar: { name: 'عطر للجنسين', short: 'عطر منعش مناسب للرجال والنساء', desc: 'عطر للجنسين من AMIRA STORE. تركيبة منعشة من الحمضيات والمسك. عطر متوازن يناسب الجميع. يدوم طويلاً. عبوة 100 مل.' },
      en: { name: 'Unisex Fragrance', short: 'Refreshing fragrance suitable for men and women', desc: 'Unisex Fragrance from AMIRA STORE. A refreshing formula of citrus and musk. A balanced fragrance that suits everyone. Long-lasting. 100ml bottle.' },
    },
    variants: [{ stock: 22, sku: 'FU-001' }],
    tags: { ar: ['عطر', 'للجنسين', 'منعش'], en: ['fragrance', 'unisex', 'fresh'] },
  },
  // ===== ACCESSORIES (2 products) =====
  {
    slug: 'sunglasses-classic',
    sku: 'AC-001',
    categorySlug: 'women-bags-handbags',
    price: 599,
    costPrice: 250,
    hasVariants: true,
    isFeatured: false,
    images: ['p-acc1.jpg'],
    tr: {
      ar: { name: 'نظارة شمسية كلاسيكية', short: 'نظارة شمسية أنيقة بحماية UV', desc: 'نظارة شمسية كلاسيكية من AMIRA STORE. تصميم خالد يناسب جميع الوجوه. حماية كاملة من الأشعة فوق البنفسجية. إطار متين وعدسات عالية الجودة.' },
      en: { name: 'Classic Sunglasses', short: 'Elegant sunglasses with UV protection', desc: 'Classic Sunglasses from AMIRA STORE. A timeless design that suits all faces. Full UV protection. Durable frame and high-quality lenses.' },
    },
    variants: [
      { color: 'أسود', colorHex: '#1A1A1A', stock: 18, sku: 'AC-001-BK' },
      { color: 'بني', colorHex: '#8B4513', stock: 12, sku: 'AC-001-BR' },
    ],
    tags: { ar: ['نظارة', 'صيفي', 'UV'], en: ['sunglasses', 'summer', 'UV'] },
  },
  {
    slug: 'gold-necklace',
    sku: 'AC-002',
    categorySlug: 'women-bags-clutches',
    price: 899,
    comparePrice: 1100,
    costPrice: 450,
    hasVariants: false,
    isFeatured: true,
    images: ['p-acc2.jpg'],
    tr: {
      ar: { name: 'عقد ذهبي أنيق', short: 'عقد ذهبي راقي للمناسبات', desc: 'عقد ذهبي أنيق من AMIRA STORE. تصميم راقٍ يضيف لمسة من الفخامة. طلاء مقاوم للبهتان. مثالي للإطلالات اليومية والمناسبات.' },
      en: { name: 'Elegant Gold Necklace', short: 'Refined gold necklace for occasions', desc: 'Elegant Gold Necklace from AMIRA STORE. A refined design that adds a touch of luxury. Fade-resistant coating. Perfect for everyday looks and occasions.' },
    },
    variants: [{ stock: 20, sku: 'AC-002' }],
    tags: { ar: ['مجوهرات', 'ذهبي', 'عقد'], en: ['jewelry', 'gold', 'necklace'] },
  },
];

// Reviews are user-generated in production; the default seed creates none.
const REVIEWS: { slug: string; rating: number; name: string; comment: string }[] = [
  { slug: 'floral-midi-dress', rating: 5, name: 'سارة أحمد', comment: 'فستان رائع جداً! القماش مريح والتصميم زهري جميل. حصلت عليه لمناسبة خاصة وكنت المتألقة.' },
  { slug: 'floral-midi-dress', rating: 4, name: 'مريم خالد', comment: 'جودة القماش ممتازة لكن المقاس كان أكبر قليلاً مما توقعت.' },
  { slug: 'floral-midi-dress', rating: 5, name: 'نورا سعيد', comment: 'أحببت الفستان جداً! لونه زاهٍ وتفاصيله دقيقة. أنصح به بشدة.' },
  { slug: 'elegant-evening-dress', rating: 5, name: 'رنا محمود', comment: 'فستان سهرة فاخر بكل معنى الكلمة. حصلت على الكثير من الإعجابات.' },
  { slug: 'elegant-evening-dress', rating: 4, name: 'دينا فتحي', comment: 'تصميم أنيق جداً وجودة عالية. السعر يستحق كل جنيه.' },
  { slug: 'classic-white-blouse', rating: 5, name: 'هدى علي', comment: 'بلوزة كلاسيكية جميلة تناسب العمل والمناسبات. قماش مريح جداً.' },
  { slug: 'classic-white-blouse', rating: 4, name: 'سمر حسن', comment: 'بلوزة أنيقة ومريحة. غسيلها سهل ولا تتغير شكلها.' },
  { slug: 'slim-fit-jeans', rating: 4, name: 'لمى كمال', comment: 'جينز مريح وقصة ممتازة. يبرز القامة بشكل جميل.' },
  { slug: 'slim-fit-jeans', rating: 3, name: 'ياسمين رضا', comment: 'جودة الجينز جيدة لكني توقعت مرونة أكثر.' },
  { slug: 'elegant-heels', rating: 5, name: 'فريدة شريف', comment: 'حذاء كعب أنيق ومريح رغم ارتفاعه. أستطيع المشي فيه لساعات.' },
  { slug: 'elegant-heels', rating: 4, name: 'رانيا سيد', comment: 'حذاء جميل جداً وتصميم راقي. يناسب السهرات والمناسبات.' },
  { slug: 'leather-handbag', rating: 5, name: 'مى عادل', comment: 'حقيبة يد فاخرة جداً! الجلد الطبيعي ملمسه رائع والتصميم عملي.' },
  { slug: 'leather-handbag', rating: 4, name: 'علا حسني', comment: 'حقيبة جميلة ومساحة داخلية واسعة. تناسب العمل والخروجات.' },
  { slug: 'classic-polo-shirt', rating: 4, name: 'أحمد محمد', comment: 'تيشيرت بولو كلاسيكي مريح. قطن بيكية ممتاز الجودة.' },
  { slug: 'classic-polo-shirt', rating: 5, name: 'كريم رشدي', comment: 'أفضل تيشيرت بولو اشتريته. تصميم خالد ومريح جداً.' },
  { slug: 'mens-slim-jeans', rating: 4, name: 'عمر فؤاد', comment: 'جينز رجالي سليم فيت مريح. قصة عصرية وجودة دنيم ممتازة.' },
  { slug: 'mens-sneakers', rating: 5, name: 'محمد طارق', comment: 'حذاء رياضي مريح جداً! نعل مرن ومصمم عصري. أنصح به.' },
  { slug: 'luxury-watch', rating: 5, name: 'خالد سامي', comment: 'ساعة فاخرة بتصميم كلاسيكي أنيق. حركة دقيقة وتناسب جميع الإطلالات.' },
  { slug: 'kids-summer-dress', rating: 5, name: 'مها جلال', comment: 'فستان صيفي لطيف جداً لبنتي. قماش قطني ناعم ومريح للعب.' },
  { slug: 'baby-onesie-set', rating: 5, name: 'هدى كمال', comment: 'طقم بادي قطني ناعم جداً لحديث الولادة. سهّل اللبس وغسيله ممتاز.' },
  { slug: 'matte-lipstick', rating: 5, name: 'سارة حمدي', comment: 'أحمر شفاه مطفي يدوم طويلاً! لون مكثف وجميل جداً.' },
  { slug: 'facial-serum', rating: 4, name: 'دينا فتحي', comment: 'سيروم فيتامين C ممتاز. لاحظت فرق في بشرتي بعد أسبوعين.' },
  { slug: 'eau-de-parfum-women', rating: 5, name: 'رنا محمود', comment: 'عطر نسائي فاخر يدوم طويلاً. رائحة زهرية شرقية جميلة جداً.' },
  { slug: 'mens-cologne', rating: 4, name: 'أحمد محمد', comment: 'كولون رجالي بعطر خشبي قوي. ثباته ممتاز ويناسب المناسبات.' },
  { slug: 'gold-necklace', rating: 5, name: 'مى عادل', comment: 'عقد ذهبي أنيق جداً! تصميم راقي وطلاء مقاوم للبهتان.' },
  { slug: 'sunglasses-classic', rating: 4, name: 'ياسمين رضا', comment: 'نظارة شمسية كلاسيكية أنيقة. حماية UV ممتازة وإطار متين.' },
  { slug: 'luxury-watch', rating: 4, name: 'عمر فؤاد', comment: 'ساعة كلاسيكية جميلة وتناسب العمل والمناسبات الرسمية.' },
  { slug: 'elegant-heels', rating: 3, name: 'فريدة شريف', comment: 'حذاء جميل لكني كنت أتوقع راحة أكثر في الكعب العالي.' },
];

// Coupons (3 total)
const COUPONS = [
  { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrder: 500, usageLimit: 100 },
  { code: 'SUMMER20', type: 'PERCENTAGE', value: 20, minOrder: 1500, usageLimit: 50 },
  { code: 'FLAT100', type: 'FIXED', value: 100, minOrder: 800, usageLimit: 200 },
];

// ============================================================
// SEED FUNCTIONS
// ============================================================

async function createCategoryTree(cats: any[], parentId: string | null = null): Promise<Record<string, string>> {
  const slugToId: Record<string, string> = {};
  for (let i = 0; i < cats.length; i++) {
    const cat = cats[i];
    const imgData = cat.image ? img(cat.image) : null;
    const created = await prisma.category.create({
      data: {
        parentId,
        slug: cat.slug,
        order: i,
        isActive: true,
        translations: {
          create: [
            { locale: 'ar', name: cat.tr.ar, description: cat.tr.ar },
            { locale: 'en', name: cat.tr.en, description: cat.tr.en },
          ],
        },
        ...(imgData
          ? {
              image: {
                create: {
                  base64Data: imgData.base64Data,
                  mimeType: imgData.mimeType,
                  fileSize: imgData.fileSize,
                  width: 400,
                  height: 400,
                },
              },
            }
          : {}),
      },
    });
    slugToId[cat.slug] = created.id;
    if (cat.children && cat.children.length > 0) {
      const childMap = await createCategoryTree(cat.children, created.id);
      Object.assign(slugToId, childMap);
    }
  }
  return slugToId;
}

async function main() {
  console.log('🌱 Starting AMIRA STORE seed...\n');

  // 1. Clean database
  console.log('🧹 Cleaning database...');
  const tables = [
    'order_items', 'orders', 'wishlist_items', 'wishlists',
    'cart_items', 'carts', 'reviews', 'related_products',
    'product_tags', 'product_variants', 'product_images',
    'product_translations', 'products', 'category_images',
    'category_translations', 'categories', 'addresses',
    'coupons', 'banners', 'store_settings', 'users',
  ];
  const modelMap: Record<string, string> = {
    order_items: 'orderItem', orders: 'order',
    wishlist_items: 'wishlistItem', wishlists: 'wishlist',
    cart_items: 'cartItem', carts: 'cart',
    reviews: 'review', related_products: 'relatedProduct',
    product_tags: 'productTag', product_variants: 'productVariant',
    product_images: 'productImage', product_translations: 'productTranslation',
    products: 'product', category_images: 'categoryImage',
    category_translations: 'categoryTranslation', categories: 'category',
    addresses: 'address', coupons: 'coupon', banners: 'banner',
    store_settings: 'storeSettings', users: 'user',
  };
  for (const t of tables) {
    try {
      await (prisma as any)[modelMap[t]].deleteMany({});
    } catch (e) {
      // ignore - table might not exist yet
    }
  }
  console.log('   ✓ Done\n');

  // 2. Store settings
  console.log('⚙️  Creating store settings...');
  await prisma.storeSettings.create({
    data: {
      id: 'singleton',
      whatsappNumber: STORE_WHATSAPP,
      storeNameAr: 'أميرا ستور',
      storeNameEn: 'AMIRA STORE',
      email: 'info@amirastore.com',
      addressAr: 'القاهرة، مصر',
      addressEn: 'Cairo, Egypt',
      currency: 'EGP',
      freeShippingEnabled: false,
      announcementAr: 'اكتشف تشكيلتنا الجديدة',
      announcementEn: 'Discover our latest collection',
      instagramUrl: 'https://www.instagram.com/',
      facebookUrl: 'https://www.facebook.com/',
    },
  });
  console.log('   ✓ Done\n');

  // 3. Admin user
  console.log('👤 Creating admin user...');
  const passwordHash = await bcrypt.hash(ADMIN.password, 10);
  await prisma.user.create({
    data: {
      username: ADMIN.username,
      phone: ADMIN.phone,
      fullName: ADMIN.fullName,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`   ✓ Admin: ${ADMIN.username}\n`);

  // 4. Categories
  console.log('📂 Creating category tree...');
  const categoryMap = await createCategoryTree(CATEGORIES);
  console.log(`   ✓ ${Object.keys(categoryMap).length} categories created\n`);

  // 5. Banners
  console.log('🖼️  Creating banners...');
  for (const b of BANNERS) {
    const imgData = img(b.image);
    await prisma.banner.create({
      data: {
        type: b.type,
        base64Data: imgData.base64Data,
        mimeType: imgData.mimeType,
        fileSize: imgData.fileSize,
        titleAr: b.titleAr,
        titleEn: b.titleEn,
        subtitleAr: b.subtitleAr,
        subtitleEn: b.subtitleEn,
        ctaTextAr: b.ctaTextAr,
        ctaTextEn: b.ctaTextEn,
        ctaLink: b.ctaLink,
        order: b.order,
        isActive: true,
      },
    });
  }
  console.log(`   ✓ ${BANNERS.length} banners created\n`);

  // 6. Products
  console.log('📦 Creating products...');
  for (const p of PRODUCTS) {
    const categoryId = categoryMap[p.categorySlug];
    if (!categoryId) {
      console.error(`   ✗ Category not found for product ${p.slug}: ${p.categorySlug}`);
      continue;
    }
    const imagesData = p.images.map((f, i) => {
      const d = img(f);
      return {
        base64Data: d.base64Data,
        mimeType: d.mimeType,
        fileSize: d.fileSize,
        order: i,
        isPrimary: i === 0,
      };
    });

    await prisma.product.create({
      data: {
        slug: p.slug,
        sku: p.sku,
        categoryId,
        price: p.price,
        comparePrice: p.comparePrice,
        costPrice: p.costPrice,
        hasVariants: p.hasVariants,
        isActive: true,
        isFeatured: p.isFeatured,
        isDeleted: false,
        translations: {
          create: [
            {
              locale: 'ar',
              name: p.tr.ar.name,
              shortDescription: p.tr.ar.short,
              description: p.tr.ar.desc,
            },
            {
              locale: 'en',
              name: p.tr.en.name,
              shortDescription: p.tr.en.short,
              description: p.tr.en.desc,
            },
          ],
        },
        images: { create: imagesData },
        variants: {
          create: p.variants || [{ stock: 50, sku: p.sku }],
        },
        tags: {
          create: [
            ...p.tags.ar.map((t) => ({ locale: 'ar', tag: t })),
            ...p.tags.en.map((t) => ({ locale: 'en', tag: t })),
          ],
        },
      },
    });
  }
  console.log(`   ✓ ${PRODUCTS.length} products created\n`);

  // 7. Reviews
  console.log('⭐ Creating reviews...');
  let reviewCount = 0;
  for (const r of REVIEWS) {
    const product = await prisma.product.findUnique({ where: { slug: r.slug } });
    if (!product) continue;
    await prisma.review.create({
      data: {
        productId: product.id,
        guestName: r.name,
        rating: r.rating,
        comment: r.comment,
        isApproved: true,
      },
    });
    reviewCount++;
  }
  console.log(`   ✓ ${reviewCount} reviews created\n`);

  // 8. Coupons
  console.log('🎟️  Creating coupons...');
  for (const c of COUPONS) {
    await prisma.coupon.create({
      data: {
        code: c.code,
        type: c.type,
        value: c.value,
        minOrder: c.minOrder,
        isActive: true,
        usageLimit: c.usageLimit,
        usedCount: 0,
      },
    });
  }
  console.log(`   ✓ ${COUPONS.length} coupons created\n`);

  console.log('========================================');
  console.log('🎉 AMIRA STORE seed completed!');
  console.log('========================================');
  console.log(`Admin:      ${ADMIN.username}`);
  console.log(`WhatsApp:   ${STORE_WHATSAPP}`);
  console.log(`Products:   ${PRODUCTS.length}`);
  console.log(`Categories: ${Object.keys(categoryMap).length}`);
  console.log(`Banners:    ${BANNERS.length}`);
  console.log(`Reviews:    ${reviewCount}`);
  console.log(`Coupons:    ${COUPONS.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
