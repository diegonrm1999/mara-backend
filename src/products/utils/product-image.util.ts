const PRODUCT_CDN_BASE = 'https://cdn.marabydukarmo.com';

export function getProductVariantImageUrl(variantId: string): string {
  return `${PRODUCT_CDN_BASE}/${variantId}.webp`;
}
