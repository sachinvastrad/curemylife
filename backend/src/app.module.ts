import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CasesModule } from './cases/cases.module';
import { DoctorsModule } from './doctors/doctors.module';
import { AiModule } from './ai/ai.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PaymentsModule } from './payments/payments.module';
import { AdminModule } from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SpecialitiesModule } from './specialities/specialities.module';
import { DietModule } from './diet/diet.module';
import { ServicesModule } from './services/services.module';
import { ServiceRequestsModule } from './service-requests/service-requests.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CasesModule,
    DoctorsModule,
    AiModule,
    AppointmentsModule,
    PaymentsModule,
    AdminModule,
    ReviewsModule,
    SpecialitiesModule,
    DietModule,
    ServicesModule,
    ServiceRequestsModule,
  ],
})
export class AppModule {}
