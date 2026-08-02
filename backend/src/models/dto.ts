import { Category, CarouselBanner, FooterConfig, OrderLedger, Product, User } from '@prisma/client';

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
    instagramUrl: footer.instagramUrl,
    facebookUrl: footer.facebookUrl,
    safetyDisclaimer: footer.safetyDisclaimer,
  };
}

export function toUserDTO(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    mobile: user.mobile,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export type OrderWithCustomer = OrderLedger & { customer?: User | null };

export function toOrderDTO(order: OrderWithCustomer) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    customerType: order.customerId ? ('REGISTERED' as const) : ('GUEST' as const),
    customerId: order.customerId,
    customerName: order.customer?.name ?? order.guestName,
    customerMobile: order.customer?.mobile ?? order.guestMobile,
    pickupDate: order.pickupDate,
    pickupTime: order.pickupTime,
    notes: order.notes,
    items: order.items,
    estimatedTotal: Number(order.estimatedTotal),
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentProvider: order.paymentProvider,
    paymentReference: order.paymentReference,
    utrNumber: order.utrNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
