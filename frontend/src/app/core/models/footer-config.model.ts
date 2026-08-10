export interface ShopAddress {
  address: string;
  /** The location published in the LocalBusiness structured data. */
  isPrimary: boolean;
}

export interface FooterConfig {
  shopName: string;
  /** One entry per branch; exactly one is flagged as the primary location. */
  addresses: ShopAddress[];
  licenseNumber: string;
  phone: string;
  whatsappNumber: string;
  /** Empty string means "not configured" — the storefront hides the icon. */
  instagramUrl: string;
  facebookUrl: string;
  safetyDisclaimer: string;
}
