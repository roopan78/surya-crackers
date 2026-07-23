import { Category, CarouselBanner, FooterConfig, OrderLedger, Product } from '@prisma/client';

/**
 * Prisma's Decimal fields (de)serialize as strings/objects over JSON by default.
 * These mappers normalize the wire format and add a couple of convenience
 * fields (categorySlug, imageUrl) so the shape lines up with the existing
 * Angular storefront models without renaming the canonical DB columns.
 */

export type ProductWithCategory = Product & { category: Category };

export function toProductDTO(product: ProductWithCategory) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    slug: product.slug,
    categoryId: product.categoryId,
    categorySlug: product.category.slug,
    category: toCategoryDTO(product.category),
    price: Number(product.price),
    boxQuantity: product.boxQuantity,
    imageUrls: product.imageUrls,
    imageUrl: product.imageUrls[0] ?? '',
    videoUrl: product.videoUrl ?? '',
    safetyInstructions: product.safetyInstructions,
    isFeatured: product.isFeatured,
    isActive: product.isActive,
    stockCount: product.stockCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

export function toCategoryDTO(category: Category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    image: category.imagePath ?? '',
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function toBannerDTO(banner: CarouselBanner) {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl,
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
  };
}

export function toFooterDTO(footer: FooterConfig) {
  return {
    shopName: footer.shopName,
    address: footer.address,
    licenseNumber: footer.licenseNumber,
    phone: footer.phone,
    whatsappNumber: footer.whatsappNumber,
    safetyDisclaimer: footer.safetyDisclaimer,
  };
}

export function toOrderDTO(order: OrderLedger) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    deliveryAddress: order.deliveryAddress,
    phone: order.phone,
    preferredDate: order.preferredDate,
    items: order.items,
    estimatedTotal: Number(order.estimatedTotal),
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
