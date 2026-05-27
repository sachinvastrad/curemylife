import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  // Validated server-side against the Service's intakeFields definition
  intakePayload: unknown;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SubmitServiceRequestDto {
  // Allow updating the payload right before submit (single shot)
  @IsOptional()
  intakePayload?: unknown;

  @IsOptional()
  @IsString()
  notes?: string;
}
