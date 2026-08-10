export interface FooterConfig {
  shopName: string;
  /** One entry per branch; the first is treated as the primary location. */
  addresses: string[];
  licenseNumber: string;
  phone: string;
  whatsappNumber: string;
  /** Empty string means "not configured" — the storefront hides the icon. */
  instagramUrl: string;
  facebookUrl: string;
  safetyDisclaimer: string;
}
