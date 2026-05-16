-- CreateEnum
CREATE TYPE "Role" AS ENUM ('Stylist', 'Cashier', 'Supervisor', 'Admin');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('Created', 'Claimed', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'Yape', 'Card');

-- CreateEnum
CREATE TYPE "ScheduledOrderStatus" AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'NoShow', 'Completed');

-- CreateEnum
CREATE TYPE "ScheduledOrderSource" AS ENUM ('Web', 'Internal');

-- CreateEnum
CREATE TYPE "ScheduleExceptionType" AS ENUM ('DayOff', 'CustomHours');

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "publicApiKey" TEXT NOT NULL,
    "lastOrderNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "TreatmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL,
    "basePrice" DOUBLE PRECISION,
    "categoryId" TEXT,
    "shopId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserTreatment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserScheduleException" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "ScheduleExceptionType" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTreatment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "stylistId" TEXT NOT NULL,
    "supervisorId" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "stylistEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidAmount" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod",
    "status" "OrderStatus" NOT NULL DEFAULT 'Created',
    "orderNumber" INTEGER NOT NULL,
    "ticketNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledOrder" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "contactEmail" TEXT,
    "clientId" TEXT,
    "stylistId" TEXT,
    "createdById" TEXT,
    "source" "ScheduledOrderSource" NOT NULL DEFAULT 'Web',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "status" "ScheduledOrderStatus" NOT NULL DEFAULT 'Pending',
    "notes" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ScheduledOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledOrderTreatment" (
    "id" TEXT NOT NULL,
    "scheduledOrderId" TEXT NOT NULL,
    "treatmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledOrderTreatment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_publicApiKey_key" ON "Shop"("publicApiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_dni_key" ON "Client"("dni");

-- CreateIndex
CREATE INDEX "clients_shop_name" ON "Client"("shopId", "firstName", "lastName");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentCategory_shopId_name_key" ON "TreatmentCategory"("shopId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "UserTreatment_userId_treatmentId_key" ON "UserTreatment"("userId", "treatmentId");

-- CreateIndex
CREATE INDEX "UserSchedule_userId_dayOfWeek_idx" ON "UserSchedule"("userId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "UserScheduleException_userId_date_key" ON "UserScheduleException"("userId", "date");

-- CreateIndex
CREATE INDEX "orders_shop_date" ON "Order"("shopId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_shop_status" ON "Order"("shopId", "status");

-- CreateIndex
CREATE INDEX "orders_shop_stylist" ON "Order"("shopId", "stylistId");

-- CreateIndex
CREATE INDEX "orders_shop_supervisor" ON "Order"("shopId", "supervisorId");

-- CreateIndex
CREATE INDEX "orders_shop_cashier" ON "Order"("shopId", "cashierId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_shopId_orderNumber_key" ON "Order"("shopId", "orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledOrder_orderId_key" ON "ScheduledOrder"("orderId");

-- CreateIndex
CREATE INDEX "scheduled_orders_shop_date" ON "ScheduledOrder"("shopId", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_orders_shop_status" ON "ScheduledOrder"("shopId", "status");

-- CreateIndex
CREATE INDEX "scheduled_orders_shop_stylist" ON "ScheduledOrder"("shopId", "stylistId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentCategory" ADD CONSTRAINT "TreatmentCategory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TreatmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTreatment" ADD CONSTRAINT "UserTreatment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserTreatment" ADD CONSTRAINT "UserTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSchedule" ADD CONSTRAINT "UserSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSchedule" ADD CONSTRAINT "UserSchedule_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserScheduleException" ADD CONSTRAINT "UserScheduleException_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTreatment" ADD CONSTRAINT "OrderTreatment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTreatment" ADD CONSTRAINT "OrderTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrder" ADD CONSTRAINT "ScheduledOrder_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrder" ADD CONSTRAINT "ScheduledOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrder" ADD CONSTRAINT "ScheduledOrder_stylistId_fkey" FOREIGN KEY ("stylistId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrder" ADD CONSTRAINT "ScheduledOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrder" ADD CONSTRAINT "ScheduledOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrderTreatment" ADD CONSTRAINT "ScheduledOrderTreatment_scheduledOrderId_fkey" FOREIGN KEY ("scheduledOrderId") REFERENCES "ScheduledOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledOrderTreatment" ADD CONSTRAINT "ScheduledOrderTreatment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
