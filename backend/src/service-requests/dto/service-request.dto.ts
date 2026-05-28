import { IsString, IsNotEmpty, IsOptional, IsObject, IsDefined } from 'class-validator';

/**
 * Notes on ValidationPipe interaction — same as service.dto.ts:
 * forbidNonWhitelisted means every field needs at least one validator
 * decorator. For `intakePayload` (free-shape JSON), we use @IsObject() to
 * satisfy the pipe; the deep shape check (each key matches a FieldDef)
 * happens server-side in `intake-validation.ts`.
 */

export class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @IsDefined({ message: 'intakePayload is required' })
  @IsObject({ message: 'intakePayload must be an object' })
  intakePayload: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitServiceRequestDto {
  // Allow updating the payload right before submit (single shot)
  @IsOptional()
  @IsObject({ message: 'intakePayload must be an object' })
  intakePayload?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  notes?: string;
}
