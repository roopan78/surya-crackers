import { Category } from './category.model';
import { Product } from './product.model';
import { CarouselBanner } from './carousel-banner.model';
import { FooterConfig } from './footer-config.model';

/**
 * Mock catalog data. In this frontend-only phase there is no backend —
 * these arrays seed local state (see CatalogService) which is then
 * persisted to localStorage so Admin edits survive reloads.
 *
 * Placeholder image backgrounds are deliberately vivid (not near-black)
 * so they stay visible against this app's dark-slate theme — near-black
 * placeholders would otherwise blend invisibly into the UI.
 */

export const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name: 'Sparklers',
    slug: 'sparklers',
    image: 'https://placehold.co/400x400/d97706/ffffff?text=Sparklers',
  },
  {
    id: 'cat-2',
    name: 'Flower Pots',
    slug: 'flower-pots',
    image: 'https://placehold.co/400x400/dc2626/ffffff?text=Flower+Pots',
  },
  {
    id: 'cat-3',
    name: 'Aerial Rockets',
    slug: 'aerial-rockets',
    image: 'https://placehold.co/400x400/2563eb/ffffff?text=Rockets',
  },
  {
    id: 'cat-4',
    name: 'Ground Chakkars',
    slug: 'ground-chakkars',
    image: 'https://placehold.co/400x400/7c3aed/ffffff?text=Chakkars',
  },
  {
    id: 'cat-5',
    name: 'Sound Crackers',
    slug: 'sound-crackers',
    image: 'https://placehold.co/400x400/ea580c/ffffff?text=Sound',
  },
  {
    id: 'cat-6',
    name: 'Fancy & Novelty',
    slug: 'fancy-novelty',
    image: 'https://placehold.co/400x400/c026d3/ffffff?text=Fancy',
  },
  {
    id: 'cat-7',
    name: 'Gift Boxes',
    slug: 'gift-boxes',
    image: 'https://placehold.co/400x400/059669/ffffff?text=Gift+Box',
  },
  {
    id: 'cat-8',
    name: 'Kids Special',
    slug: 'kids-special',
    image: 'https://placehold.co/400x400/0891b2/ffffff?text=Kids',
  },
];

const SAMPLE_VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Electric Color Sparklers 7"',
    categorySlug: 'sparklers',
    price: 120,
    boxQuantity: '10 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/d97706/ffffff?text=Color+Sparklers',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Light one at a time at arm’s length. Hold upright, away from face and clothing. Do not use indoors. Keep a bucket of water nearby.',
    isFeatured: true,
  },
  {
    id: 'prod-2',
    name: 'Golden Sparklers 10"',
    categorySlug: 'sparklers',
    price: 150,
    boxQuantity: '10 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/b45309/ffffff?text=Golden+Sparklers',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Adult supervision required for children. Light outdoors only. Never re-light a used sparkler.',
    isFeatured: false,
  },
  {
    id: 'prod-3',
    name: 'Deluxe Flower Pot (Anar) Large',
    categorySlug: 'flower-pots',
    price: 90,
    boxQuantity: '1 Pc per box',
    imageUrl: 'https://placehold.co/600x600/dc2626/ffffff?text=Flower+Pot',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Place on flat ground, away from dry leaves and vehicles. Light the fuse and step back at least 5 metres immediately.',
    isFeatured: true,
  },
  {
    id: 'prod-4',
    name: 'Mini Flower Pot Combo (Pack of 5)',
    categorySlug: 'flower-pots',
    price: 200,
    boxQuantity: '5 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/be123c/ffffff?text=Mini+Flower+Pot',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Suitable for supervised family use. Keep a minimum safe distance of 5 metres once lit.',
    isFeatured: false,
  },
  {
    id: 'prod-5',
    name: 'Sky Shot Rocket 12 Shots',
    categorySlug: 'aerial-rockets',
    price: 450,
    boxQuantity: '1 Box of 12 shots',
    imageUrl: 'https://placehold.co/600x600/2563eb/ffffff?text=Sky+Shot',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Use only in wide open outdoor areas, away from buildings, trees and overhead wires. Place on stable ground and light from a safe distance.',
    isFeatured: true,
  },
  {
    id: 'prod-6',
    name: 'Whistling Rocket (Pack of 10)',
    categorySlug: 'aerial-rockets',
    price: 180,
    boxQuantity: '10 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/1d4ed8/ffffff?text=Whistling+Rocket',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Launch vertically from a bottle or stand on open ground. Never point at people, animals or property.',
    isFeatured: false,
  },
  {
    id: 'prod-7',
    name: 'Ground Chakkar Big (Pack of 5)',
    categorySlug: 'ground-chakkars',
    price: 100,
    boxQuantity: '5 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/7c3aed/ffffff?text=Ground+Chakkar',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Pin securely to the ground before lighting. Keep pets and children away from the spinning radius.',
    isFeatured: false,
  },
  {
    id: 'prod-8',
    name: 'Twin Sound Chakkar',
    categorySlug: 'ground-chakkars',
    price: 130,
    boxQuantity: '4 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/6d28d9/ffffff?text=Twin+Chakkar',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Fix on a flat, hard surface. Light and retreat immediately to a safe distance.',
    isFeatured: false,
  },
  {
    id: 'prod-9',
    name: 'Lakshmi 100 Wala (Sound)',
    categorySlug: 'sound-crackers',
    price: 60,
    boxQuantity: '1 Bundle of 100',
    imageUrl: 'https://placehold.co/600x600/ea580c/ffffff?text=Sound+Cracker',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Comply with local noise regulations and permitted hours. Use ear protection. Light and move away immediately.',
    isFeatured: true,
  },
  {
    id: 'prod-10',
    name: 'Two Sound Bomb (Pack of 10)',
    categorySlug: 'sound-crackers',
    price: 140,
    boxQuantity: '10 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/c2410c/ffffff?text=Two+Sound',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Strictly for outdoor open ground use. Keep well away from residential windows and vehicles.',
    isFeatured: false,
  },
  {
    id: 'prod-11',
    name: 'Peacock Fountain Fancy',
    categorySlug: 'fancy-novelty',
    price: 220,
    boxQuantity: '1 Pc per box',
    imageUrl: 'https://placehold.co/600x600/c026d3/ffffff?text=Peacock+Fountain',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Place upright on a level, non-flammable surface. Keep spectators at least 3 metres back.',
    isFeatured: true,
  },
  {
    id: 'prod-12',
    name: 'Butterfly Novelty Cracker',
    categorySlug: 'fancy-novelty',
    price: 95,
    boxQuantity: '6 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/a21caf/ffffff?text=Butterfly',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Light on open ground only. Do not hold in hand after lighting.',
    isFeatured: false,
  },
  {
    id: 'prod-13',
    name: 'Family Celebration Gift Box',
    categorySlug: 'gift-boxes',
    price: 1499,
    boxQuantity: '1 Assorted Box (45 items)',
    imageUrl: 'https://placehold.co/600x600/059669/ffffff?text=Gift+Box',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Assorted box contains mixed product types — follow the individual safety instructions printed on each item.',
    isFeatured: true,
  },
  {
    id: 'prod-14',
    name: 'Grand Diwali Hamper',
    categorySlug: 'gift-boxes',
    price: 2999,
    boxQuantity: '1 Premium Box (80 items)',
    imageUrl: 'https://placehold.co/600x600/047857/ffffff?text=Diwali+Hamper',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Premium assorted hamper — read each item’s label before use. Recommended for supervised family gatherings.',
    isFeatured: true,
  },
  {
    id: 'prod-15',
    name: 'Kids Snake Tablets (Non-Explosive)',
    categorySlug: 'kids-special',
    price: 50,
    boxQuantity: '10 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/0891b2/ffffff?text=Snake+Tablet',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Low-risk novelty item. Adult supervision still recommended. Place on a heat-safe plate before lighting.',
    isFeatured: false,
  },
  {
    id: 'prod-16',
    name: 'Kids Sparkler Fun Pack',
    categorySlug: 'kids-special',
    price: 180,
    boxQuantity: '20 Pcs per box',
    imageUrl: 'https://placehold.co/600x600/0e7490/ffffff?text=Kids+Sparkler+Pack',
    videoUrl: SAMPLE_VIDEO,
    safetyInstructions:
      'Designed for supervised children’s use. Adults must light and hand over safely. Never run while holding a lit sparkler.',
    isFeatured: false,
  },
];

export const MOCK_BANNERS: CarouselBanner[] = [
  {
    id: 'banner-1',
    title: 'Diwali Mega Sale — Up to 30% Off',
    subtitle: 'Premium crackers, delivered safely to your doorstep',
    imageUrl: 'https://placehold.co/1600x600/ea580c/ffffff?text=Diwali+Mega+Sale',
    sortOrder: 1,
  },
  {
    id: 'banner-2',
    title: 'Family Gift Boxes Now Live',
    subtitle: 'Curated assortments for every celebration size',
    imageUrl: 'https://placehold.co/1600x600/7c3aed/ffffff?text=Family+Gift+Boxes',
    sortOrder: 2,
  },
  {
    id: 'banner-3',
    title: 'New: Kids Special Range',
    subtitle: 'Safer, low-noise options for the little ones',
    imageUrl: 'https://placehold.co/1600x600/0891b2/ffffff?text=Kids+Special+Range',
    sortOrder: 3,
  },
];

export const MOCK_FOOTER_CONFIG: FooterConfig = {
  shopName: 'Surya Crackers',
  address: '14, Bypass Road, Sivakasi, Tamil Nadu 626123, India',
  licenseNumber: 'TN-EXP-LIC-2024-00981',
  phone: '+91 98765 43210',
  whatsappNumber: '919876543210',
  safetyDisclaimer:
    'Firecrackers are age-restricted (18+) and regulated products. Purchase and use only where permitted by local law and during approved hours. Read all safety instructions before use. Keep away from children unless directly supervised by an adult. Store in a cool, dry place away from open flame.',
};
