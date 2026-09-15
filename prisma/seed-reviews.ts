import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REVIEWS = [
  { slug: 'floral-midi-dress', rating: 5, name: 'سارة أحمد', comment: 'فستان رائع جداً! القماش مريح والتصميم زهري جميل.' },
  { slug: 'floral-midi-dress', rating: 4, name: 'مريم خالد', comment: 'جودة القماش ممتازة لكن المقاس كان أكبر قليلاً.' },
  { slug: 'floral-midi-dress', rating: 5, name: 'نورا سعيد', comment: 'أحببت الفستان جداً! لونه زاهٍ وتفاصيله دقيقة.' },
  { slug: 'elegant-evening-dress', rating: 5, name: 'رنا محمود', comment: 'فستان سهرة فاخر بكل معنى الكلمة.' },
  { slug: 'elegant-evening-dress', rating: 4, name: 'دينا فتحي', comment: 'تصميم أنيق جداً وجودة عالية.' },
  { slug: 'classic-white-blouse', rating: 5, name: 'هدى علي', comment: 'بلوزة كلاسيكية جميلة تناسب العمل والمناسبات.' },
  { slug: 'classic-white-blouse', rating: 4, name: 'سمر حسن', comment: 'بلوزة أنيقة ومريحة.' },
  { slug: 'slim-fit-jeans', rating: 4, name: 'لمى كمال', comment: 'جينز مريح وقصة ممتازة.' },
  { slug: 'slim-fit-jeans', rating: 3, name: 'ياسمين رضا', comment: 'جودة الجينز جيدة لكني توقعت مرونة أكثر.' },
  { slug: 'elegant-heels', rating: 5, name: 'فريدة شريف', comment: 'حذاء كعب أنيق ومريح رغم ارتفاعه.' },
  { slug: 'elegant-heels', rating: 4, name: 'رانيا سيد', comment: 'حذاء جميل جداً وتصميم راقي.' },
  { slug: 'leather-handbag', rating: 5, name: 'مى عادل', comment: 'حقيبة يد فاخرة جداً! الجلد الطبيعي ملمسه رائع.' },
  { slug: 'leather-handbag', rating: 4, name: 'علا حسني', comment: 'حقيبة جميلة ومساحة داخلية واسعة.' },
  { slug: 'classic-polo-shirt', rating: 4, name: 'أحمد محمد', comment: 'تيشيرت بولو كلاسيكي مريح.' },
  { slug: 'classic-polo-shirt', rating: 5, name: 'كريم رشدي', comment: 'أفضل تيشيرت بولو اشتريته.' },
  { slug: 'mens-slim-jeans', rating: 4, name: 'عمر فؤاد', comment: 'جينز رجالي سليم فيت مريح.' },
  { slug: 'mens-sneakers', rating: 5, name: 'محمد طارق', comment: 'حذاء رياضي مريح جداً!' },
  { slug: 'luxury-watch', rating: 5, name: 'خالد سامي', comment: 'ساعة فاخرة بتصميم كلاسيكي أنيق.' },
  { slug: 'kids-summer-dress', rating: 5, name: 'مها جلال', comment: 'فستان صيفي لطيف جداً لبنتي.' },
  { slug: 'baby-onesie-set', rating: 5, name: 'هدى كمال', comment: 'طقم بادي قطني ناعم جداً لحديث الولادة.' },
  { slug: 'matte-lipstick', rating: 5, name: 'سارة حمدي', comment: 'أحمر شفاه مطفي يدوم طويلاً!' },
  { slug: 'facial-serum', rating: 4, name: 'دينا فتحي', comment: 'سيروم فيتامين C ممتاز.' },
  { slug: 'eau-de-parfum-women', rating: 5, name: 'رنا محمود', comment: 'عطر نسائي فاخر يدوم طويلاً.' },
  { slug: 'mens-cologne', rating: 4, name: 'أحمد محمد', comment: 'كولون رجالي بعطر خشبي قوي.' },
  { slug: 'gold-necklace', rating: 5, name: 'مى عادل', comment: 'عقد ذهبي أنيق جداً!' },
  { slug: 'sunglasses-classic', rating: 4, name: 'ياسمين رضا', comment: 'نظارة شمسية كلاسيكية أنيقة.' },
];

async function main() {
  console.log('Adding reviews...\n');
  
  for (const review of REVIEWS) {
    const product = await prisma.product.findUnique({
      where: { slug: review.slug },
      include: { reviews: true },
    });
    
    if (!product) {
      console.error(`Product not found: ${review.slug}`);
      continue;
    }
    
    await prisma.review.create({
      data: {
        productId: product.id,
        guestName: review.name,
        rating: review.rating,
        comment: review.comment,
        isApproved: true,
      },
    });
    
    console.log(`  ✓ Added review for ${product.slug} (${review.rating} stars)`);
  }
  
  console.log('\nDone adding reviews!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
