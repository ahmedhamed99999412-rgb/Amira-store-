# AMIRA STORE - متجر إلكتروني متكامل

متجر إلكتروني احترافي متكامل بُني باستخدام Next.js 16 و TypeScript و Prisma. يدعم اللغتين العربية والإنجليزية بالكامل مع نظام إدارة شامل وميزات ذكاء اصطناعي.

## ✨ المميزات | Features

### 🛍️ المتجر | Storefront
- صفحة رئيسية احترافية (Hero carousel, categories, promo banners, trending products, service bar, footer)
- صفحات المنتجات والفئات مع فلترة وترتيب وتقسيم صفحات
- صفحة تفاصيل المنتج (معرض صور، متغيرات المقاس/اللون، تقييمات، منتجات ذات صلة)
- سلة تسوق (Drawer جانبي + صفحة كاملة) + قائمة مفضلة
- بحث ذكي بالـ AI (يفهم اللغة الطبيعية)
- Chatbot لخدمة العملاء
- دعم كامل للعربي (RTL) والإنجليزي (LTR) مع عزل تام

### 🔐 المصادقة | Authentication
- تسجيل دخول بـ اسم المستخدم أو رقم التليفون + كلمة السر
- رقم تليفون مصري (11 رقم يبدأ بـ 01)
- JWT في httpOnly cookies (آمن)
- شراء كضيف (Guest Checkout) مع تتبع الطلب

### 💳 الطلبات | Orders
- Checkout مع تحويل مباشر لـ واتساب المتجر (01019003677)
- رسالة واتساب منسقة احترافياً بكل تفاصيل الطلب
- الدفع عند الاستلام (COD)
- الشحن: يحدده الأدمن يدوياً (حسب العنوان) أو مجاني (لو العرض مفعل)
- تتبع الطلب برقم الطلب + التليفون

### 🎛️ لوحة الإدارة | Admin Dashboard
- المنتجات: CRUD كامل + رفع صور (Base64 في DB) + متغيرات + استيراد/تصدير CSV
- الفئات: شجرة هرمية بلا حدود للعمق + ترجمة + صور
- الطلبات: عرض + تغيير الحالة + تحديث تكلفة الشحن
- العملاء + البانرات + الإعدادات (رقم واتساب، الشحن المجاني، كلمة السر)

### 🤖 الذكاء الاصطناعي | AI Features
- بحث ذكي: "عايز فستان للفرح" → منتجات مناسبة + تفسير
- Chatbot: مساعد ذكي يعرف بيانات المتجر
- توليد وصف المنتجات + ترجمة ar↔en

### 🗄️ قاعدة البيانات | Database
- 21 جدول (Users, Categories, Products, Orders, Cart, Wishlist, Banners, Settings, etc.)
- كل الصور في قاعدة البيانات (Base64) - محمولة 100% لـ Neon/Vercel
- ترجمة كاملة لكل المحتوى (عربي/إنجليزي)
- Soft delete للمنتجات

## 🚀 التشغيل محلياً | Local Setup

> **Windows / macOS / Linux:** المشروع الآن لا يحتاج Bun للتشغيل المحلي الأساسي. استخدم **Node.js 22.6+** وnpm.

```bash
# 1. تثبيت الحزم
npm install

# 2. إنشاء ملف البيئة + توليد Prisma Client
npm run setup:local

# 3. إنشاء/مزامنة قاعدة SQLite المحلية
npm run db:push

# 4. (اختياري) استعادة بيانات المتجر الكاملة إذا كانت قاعدة البيانات فارغة
npm run db:seed:full

# 5. تشغيل خادم التطوير
npm run dev
```

### أوامر مفيدة

```bash
npm run db:generate
npm run db:seed:full
npm run lint
npm run build
npm run start
```

### ملاحظات مهمة

- في نسخة GitHub يتم وضع محتويات `project/` في جذر الـRepository، لذلك نفّذ الأوامر من جذر الـRepository.
- لا تحتاج إلى تثبيت Bun لتشغيل `dev`, `build`, `start` أو seed المحلي.
- مسار SQLite المحلي مضبوط على `../database/custom.db` بالنسبة إلى مجلد Prisma.
- ملف `.env` محلي، ولا يجب رفعه إلى GitHub. استخدم `.env.example` كنقطة بداية.
- إذا كان المشروع يعمل على جهاز جديد، نفّذ `npm run setup:local` قبل تشغيل Prisma.

### بيانات الدخول المحلية

الإعدادات الافتراضية الموجودة في `.env.example` مخصصة للتطوير المحلي فقط. غيّرها قبل أي استخدام حقيقي.
- أمر `npm run db:seed` هو seed تدميري؛ في الإنتاج يُرفض افتراضيًا ولا يعمل إلا مع `ALLOW_DESTRUCTIVE_SEED=true` بشكل متعمد.
- في الإنتاج يجب ضبط `ADMIN_PASSWORD` صراحةً قبل تشغيل أي seed.

## 🌐 النشر | Deployment

### على Vercel + Neon PostgreSQL:
1. أنشئ قاعدة بيانات على [neon.tech](https://neon.tech)
2. احتفظ بالـschemaين كما هما: `schema.prisma` لـSQLite و`schema.postgresql.prisma` لـNeon/PostgreSQL.
3. ارفع الكود على GitHub
4. على Vercel: Import Repository + أضف Environment Variables (DATABASE_URL, JWT_SECRET, etc.)
5. بعد اختبار قاعدة Neon على بيئة منفصلة، أنشئ schema باستخدام `npm run db:push:postgres` مع `DATABASE_URL` الخاص بـNeon، ثم شغّل `npm run db:seed:full` لاستعادة البيانات.

## 🛠️ التقنيات | Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui
- Prisma ORM (SQLite/PostgreSQL)
- JWT + bcrypt للمصادقة
- next-intl للثنائي اللغة
- Zustand لإدارة الحالة
- z-ai-web-dev-sdk للـ AI
