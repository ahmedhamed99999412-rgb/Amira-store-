// Download images from Unsplash and save locally for seeding
import fs from 'fs';
import path from 'path';

const IMAGE_DIR = path.join(process.cwd(), 'prisma', 'seed-images');

const IMAGES: Record<string, { url: string; file: string }> = {
  // Hero images (3)
  hero1: { url: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200&q=80', file: 'hero1.jpg' },
  hero2: { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80', file: 'hero2.jpg' },
  hero3: { url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1200&q=80', file: 'hero3.jpg' },
  // Category circles (7)
  catWomen: { url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&q=80', file: 'cat-women.jpg' },
  catMen: { url: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=400&q=80', file: 'cat-men.jpg' },
  catKids: { url: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&q=80', file: 'cat-kids.jpg' },
  catBaby: { url: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&q=80', file: 'cat-baby.jpg' },
  catBeauty: { url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&q=80', file: 'cat-beauty.jpg' },
  catFragrance: { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&q=80', file: 'cat-fragrance.jpg' },
  catAccessories: { url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', file: 'cat-accessories.jpg' },
  // Promo banners (2)
  promoBeauty: { url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=1000&q=80', file: 'promo-beauty.jpg' },
  promoKids: { url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=1000&q=80', file: 'promo-kids.jpg' },
  // Products - Women (6)
  pDress1: { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&q=80', file: 'p-dress1.jpg' },
  pDress2: { url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=80', file: 'p-dress2.jpg' },
  pTop1: { url: 'https://images.unsplash.com/photo-1551048632-24e444b48a3e?w=600&q=80', file: 'p-top1.jpg' },
  pJeans1: { url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80', file: 'p-jeans1.jpg' },
  pShoes1: { url: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=600&q=80', file: 'p-shoes1.jpg' },
  pBag1: { url: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80', file: 'p-bag1.jpg' },
  // Products - Men (5)
  pMShirt1: { url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80', file: 'p-mshirt1.jpg' },
  pMJeans1: { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80', file: 'p-mjeans1.jpg' },
  pMShoes1: { url: 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?w=600&q=80', file: 'p-mshoes1.jpg' },
  pMWatch1: { url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=600&q=80', file: 'p-mwatch1.jpg' },
  pMJacket1: { url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&q=80', file: 'p-mjacket1.jpg' },
  // Products - Kids (2)
  pKids1: { url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=600&q=80', file: 'p-kids1.jpg' },
  pKids2: { url: 'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=600&q=80', file: 'p-kids2.jpg' },
  // Products - Baby (2)
  pBaby1: { url: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600&q=80', file: 'p-baby1.jpg' },
  pBaby2: { url: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80', file: 'p-baby2.jpg' },
  // Products - Beauty (3)
  pBeauty1: { url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80', file: 'p-beauty1.jpg' },
  pBeauty2: { url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600&q=80', file: 'p-beauty2.jpg' },
  pBeauty3: { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80', file: 'p-beauty3.jpg' },
  // Products - Fragrance (3)
  pPerfume1: { url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&q=80', file: 'p-perfume1.jpg' },
  pPerfume2: { url: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&q=80', file: 'p-perfume2.jpg' },
  pPerfume3: { url: 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=600&q=80', file: 'p-perfume3.jpg' },
  // Products - Accessories (2)
  pAcc1: { url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&q=80', file: 'p-acc1.jpg' },
  pAcc2: { url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80', file: 'p-acc2.jpg' },
};

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error(`✗ ${url} → HTTP ${res.status}`);
      return false;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 1000) {
      console.error(`✗ ${url} → too small (${buf.length} bytes)`);
      return false;
    }
    fs.writeFileSync(filepath, buf);
    console.log(`✓ ${path.basename(filepath)} (${(buf.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown download error';
    console.error(`✗ ${url} → ${message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });

  let ok = 0, fail = 0;
  for (const [, info] of Object.entries(IMAGES)) {
    const filepath = path.join(IMAGE_DIR, info.file);
    if (fs.existsSync(filepath) && fs.statSync(filepath).size > 1000) {
      console.log(`= ${info.file} (cached)`);
      ok++;
      continue;
    }
    const success = await downloadImage(info.url, filepath);
    if (success) ok++;
    else fail++;
  }

  console.log(`\n=== Done: ${ok} success, ${fail} failed ===`);
  if (fail > 0) process.exit(1);
}

main();
