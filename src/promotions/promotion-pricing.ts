import { PromotionDiscountType } from '@prisma/client';

export interface DiscountRule {
  discountType: PromotionDiscountType;
  discountValue: number;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function applyDiscount(price: number, rule: DiscountRule): number {
  const discounted =
    rule.discountType === PromotionDiscountType.Percentage
      ? price * (1 - rule.discountValue / 100)
      : price - rule.discountValue;
  return roundMoney(Math.max(discounted, 0));
}

export function pickBestDiscount<T extends DiscountRule>(
  price: number,
  candidates: T[],
): { promotion: T; effectivePrice: number } | null {
  let best: { promotion: T; effectivePrice: number } | null = null;
  for (const promotion of candidates) {
    const effectivePrice = applyDiscount(price, promotion);
    if (effectivePrice < price && (!best || effectivePrice < best.effectivePrice)) {
      best = { promotion, effectivePrice };
    }
  }
  return best;
}
