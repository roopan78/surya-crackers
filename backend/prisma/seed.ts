import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_SEED_USERNAME ?? 'admin';
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMe123!';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.admin.upsert({
    where: { username: adminUsername },
    update: {},
    create: { username: adminUsername, passwordHash },
  });
  console.log(`Admin account ready: ${adminUsername}`);

  const categories = [
    { name: 'Sparklers', slug: 'sparklers', description: 'Hand-held sparkler varieties for all ages.' },
    { name: 'Flower Pots', slug: 'flower-pots', description: 'Ground-based fountain fireworks.' },
    { name: 'Rockets', slug: 'rockets', description: 'Aerial shooting rockets with aerial effects.' },
    { name: 'Chakkars', slug: 'chakkars', description: 'Spinning ground fireworks (Catherine wheels).' },
    { name: 'Sound Crackers', slug: 'sound-crackers', description: 'Traditional bursting sound crackers.' },
    { name: 'Gift Boxes', slug: 'gift-boxes', description: 'Curated assortment boxes for festive gifting.' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: { ...category, imagePath: `/uploads/categories/${category.slug}.jpg` },
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
      imageUrls: ['/uploads/products/sparklers-10cm.jpg'],
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
      imageUrls: ['/uploads/products/flower-pot-classic.jpg'],
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
      imageUrls: ['/uploads/products/rocket-7shot.jpg'],
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
    { title: 'Diwali Mega Sale', subtitle: 'Up to 40% off on family gift boxes', imageUrl: '/uploads/banners/diwali-sale.jpg', sortOrder: 1 },
    { title: 'Handpicked Sparklers', subtitle: 'Safe, bright and long-lasting', imageUrl: '/uploads/banners/sparklers-banner.jpg', sortOrder: 2 },
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
      address: '123 Fireworks Bazaar Road, Sivakasi, Tamil Nadu, India',
      licenseNumber: 'TN-FW-LICENSE-000000',
      phone: '+91 90000 00000',
      whatsappNumber: '+91 90000 00000',
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
