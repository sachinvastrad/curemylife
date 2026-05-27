import { Module } from '@nestjs/common';
import { DietController } from './diet.controller';
import { DietService } from './diet.service';
import { DietGeneratorService } from './diet-generator.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DietController],
  providers: [DietService, DietGeneratorService],
  exports: [DietService],
})
export class DietModule {}
