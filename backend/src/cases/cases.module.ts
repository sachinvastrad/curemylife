import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MulterModule.register({ dest: process.env.UPLOAD_DIR || './uploads' }),
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}
