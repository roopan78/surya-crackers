import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // No admin account is seeded here anymore — the SUPER_ADMIN_MOBILE account
  // is created automatically the first time that number completes OTP login
  // (see src/services/otp.service.ts).

  const categories = [
    { name: 'Sparklers', slug: 'sparklers', description: 'Hand-held sparkler varieties for all ages.', color: 'd97706' },
    { name: 'Flower Pots', slug: 'flower-pots', description: 'Ground-based fountain fireworks.', color: 'dc2626' },
    { name: 'Rockets', slug: 'rockets', description: 'Aerial shooting rockets with aerial effects.', color: '2563eb' },
    { name: 'Chakkars', slug: 'chakkars', description: 'Spinning ground fireworks (Catherine wheels).', color: '7c3aed' },
    { name: 'Sound Crackers', slug: 'sound-crackers', description: 'Traditional bursting sound crackers.', color: 'ea580c' },
    { name: 'Gift Boxes', slug: 'gift-boxes', description: 'Curated assortment boxes for festive gifting.', color: '059669' },
  ];

  for (const { color, ...category } of categories) {
    const imagePath = `https://placehold.co/400x400/${color}/ffffff?text=${encodeURIComponent(category.name)}`;
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, imagePath },
    });
  }
  console.log(`Seeded ${categories.length} categories.`);

  const sparklers = await prisma.category.findUniqueOrThrow({ where: { slug: 'sparklers' } });
  const flowerPots = await prisma.category.findUniqueOrThrow({ where: { slug: 'flower-pots' } });
  const rockets = await prisma.category.findUniqueOrThrow({ where: { slug: 'rockets' } });

  const products = [
    {
      name: '10cm Electric Sparklers',
      sku: 'SPK-10CM-001',
      slug: '10cm-electric-sparklers',
      categoryId: sparklers.id,
      price: 45,
      boxQuantity: '10 Pcs per box',
      imageUrls: ['https://placehold.co/600x600/d97706/ffffff?text=Electric+Sparklers'],
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      safetyInstructions: 'Light at arm\'s length. Keep away from face and flammable materials. Adult supervision required.',
      isFeatured: true,
      stockCount: 500,
    },
    {
      name: 'Classic Flower Pot (Anar)',
      sku: 'FP-CLASSIC-001',
      slug: 'classic-flower-pot',
      categoryId: flowerPots.id,
      price: 60,
      boxQuantity: '5 Pcs per box',
      imageUrls: ['https://placehold.co/600x600/dc2626/ffffff?text=Flower+Pot'],
      videoUrl: '',
      safetyInstructions: 'Place on flat, non-flammable ground. Light from a safe distance and retreat immediately.',
      isFeatured: true,
      stockCount: 300,
    },
    {
      name: 'Sky Shot Rocket (7 Shot)',
      sku: 'RKT-7SHOT-001',
      slug: 'sky-shot-rocket-7shot',
      categoryId: rockets.id,
      price: 250,
      boxQuantity: '1 Pc per box',
      imageUrls: ['https://placehold.co/600x600/2563eb/ffffff?text=Sky+Shot+Rocket'],
      videoUrl: '',
      safetyInstructions: 'Launch from an open outdoor area only. Anchor firmly upright and point away from structures and people.',
      isFeatured: false,
      stockCount: 120,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: product,
    });
  }
  console.log(`Seeded ${products.length} products.`);

  const banners = [
    { title: 'Diwali Mega Sale', subtitle: 'Up to 40% off on family gift boxes', imageUrl: 'https://placehold.co/1600x600/ea580c/ffffff?text=Diwali+Mega+Sale', sortOrder: 1 },
    { title: 'Handpicked Sparklers', subtitle: 'Safe, bright and long-lasting', imageUrl: 'https://placehold.co/1600x600/d97706/ffffff?text=Handpicked+Sparklers', sortOrder: 2 },
  ];

  for (const banner of banners) {
    const existing = await prisma.carouselBanner.findFirst({ where: { title: banner.title } });
    if (!existing) {
      await prisma.carouselBanner.create({ data: banner });
    }
  }
  console.log(`Seeded ${banners.length} carousel banners.`);

  await prisma.footerConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: 'Surya Crackers',
      addresses: ['123 Fireworks Bazaar Road, Sivakasi, Tamil Nadu, India'],
      licenseNumber: 'TN-FW-LICENSE-000000',
      phone: '+91 90000 00000',
      whatsappNumber: '919000000000',
      safetyDisclaimer:
        'Fireworks are for use by adults 18+ only. Follow all local regulations, read safety instructions on every product, and supervise children at all times.',
    },
  });
  console.log('Footer configuration ready.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
