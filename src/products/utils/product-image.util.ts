// Product images follow a fixed CDN convention keyed by the variant id
// (each variant is photographed independently, e.g. a red vs. a brown lip
// gloss). The URL is derived here instead of stored in the DB: no migration
// is needed if the CDN domain ever changes, and it can never go stale.
const PRODUCT_CDN_BASE = 'https://cdn.marabydukarmo.com';

export function getProductVariantImageUrl(variantId: string): string {
  return `${PRODUCT_CDN_BASE}/${variantId}.webp`;
}
