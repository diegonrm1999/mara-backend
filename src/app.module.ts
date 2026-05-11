import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth/auth.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TreatmentsModule } from './treatments/treatments.module';
import { OrdersService } from './orders/orders.service';
import { OrdersController } from './orders/orders.controller';
import { Usercontroller } from './users/user.controller';
import { ClientsModule } from './client/clients.module';
import { OrdersGateway } from './orders/orders.gateway';
import { FcmModule } from './fcm/fcm.module';
import reniecConfig from './config/reniec.config';
import { NotificationService } from './services/notification.service';
import { ShopService } from './shop/shop.service';
import { ShopController } from './shop/shop.controller';
import { ShopModule } from './shop/shop.module';
import { ClientsService } from './client/clients.service';
import { TreatmentsService } from './treatments/treatments.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { PdfModule } from './pdf/pdf.module';
import { EmailModule } from './email/email.module';
import { ScheduledOrdersModule } from './scheduled-orders/scheduled-orders.module';
import { UserSchedulesModule } from './user-schedules/user-schedules.module';
import { UserTreatmentsModule } from './user-treatments/user-treatments.module';
import { TreatmentCategoriesModule } from './treatment-categories/treatment-categories.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [reniecConfig],
    }),
    TreatmentsModule,
    ClientsModule,
    FcmModule,
    ShopModule,
    PdfModule,
    EmailModule,
    ScheduledOrdersModule,
    UserSchedulesModule,
    UserTreatmentsModule,
    TreatmentCategoriesModule,
  ],
  controllers: [
    AppController,
    AuthController,
    OrdersController,
    Usercontroller,
    ShopController,
    DashboardController,
  ],
  providers: [
    AppService,
    OrdersService,
    ClientsService,
    TreatmentsService,
    ConfigService,
    OrdersGateway,
    NotificationService,
    ShopService,
    DashboardService,
  ],
})
export class AppModule {}
