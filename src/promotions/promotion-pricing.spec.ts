import { PromotionDiscountType } from '@prisma/client';
import { applyDiscount, pickBestDiscount } from './promotion-pricing';

const pct = (discountValue: number) => ({
  discountType: PromotionDiscountType.Percentage,
  discountValue,
});
const fixed = (discountValue: number) => ({
  discountType: PromotionDiscountType.FixedAmount,
  discountValue,
});

describe('promotion pricing', () => {
  it('applies a percentage discount', () => {
    expect(applyDiscount(80, pct(25))).toBe(60);
  });

  it('applies a fixed discount and never goes below zero', () => {
    expect(applyDiscount(80, fixed(15))).toBe(65);
    expect(applyDiscount(10, fixed(50))).toBe(0);
  });

  it('rounds to two decimals', () => {
    expect(applyDiscount(33.33, pct(10))).toBe(30);
  });

  it('picks the discount with the lowest resulting price, without stacking', () => {
    const best = pickBestDiscount(100, [pct(10), fixed(30), pct(20)]);
    expect(best?.effectivePrice).toBe(70);
    expect(best?.promotion).toEqual(fixed(30));
  });

  it('returns null when nothing lowers the price', () => {
    expect(pickBestDiscount(100, [])).toBeNull();
    expect(pickBestDiscount(100, [fixed(0)])).toBeNull();
  });
});
