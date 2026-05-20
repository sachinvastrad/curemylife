import { Module } from '@nestjs/common';
import { SpecialitiesController } from './specialities.controller';

@Module({
  controllers: [SpecialitiesController],
})
export class SpecialitiesModule {}
