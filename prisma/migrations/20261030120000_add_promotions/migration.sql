-- CreateEnum
CREATE TYPE "PromotionDiscountType" AS ENUM ('Percentage', 'FixedAmount');

-- AlterTable
ALTER TABLE "OrderTreatment" ADD COLUMN     "originalPrice" DOUBLE PRECISION,
ADD COLUMN     "promotionId" TEXT;

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "PromotionDiscountType" NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "appliesToAllTreatments" BOOLEAN NOT NULL DEFAULT false,
    "appliesToAllProducts" BOOLEAN NOT NULL DEFAULT false,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionTarget" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "treatmentCategoryId" TEXT,
    "productId" TEXT,
    "productCategoryId" TEXT,

    CONSTRAINT "PromotionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_shopId_active_startsAt_endsAt_idx" ON "Promotion"("shopId", "active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "PromotionTarget_promotionId_idx" ON "PromotionTarget"("promotionId");

-- AddForeignKey
ALTER TABLE "OrderTreatment" ADD CONSTRAINT "OrderTreatment_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_treatmentCategoryId_fkey" FOREIGN KEY ("treatmentCategoryId") REFERENCES "TreatmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_productCategoryId_fkey" FOREIGN KEY ("productCategoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Each target row points to exactly one item
ALTER TABLE "PromotionTarget" ADD CONSTRAINT "PromotionTarget_exactly_one_target" CHECK (num_nonnulls("treatmentId", "treatmentCategoryId", "productId", "productCategoryId") = 1);
