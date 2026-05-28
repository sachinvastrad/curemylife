import {
  IsString, IsNotEmpty, IsOptional, IsArray, IsInt, IsBoolean,
  IsNumber, Min, Matches, MaxLength, ArrayNotEmpty,
} from 'class-validator';

/**
 * NOTE on ValidationPipe interaction:
 * main.ts uses `whitelist: true, forbidNonWhitelisted: true, transform: true`.
 * That means every field this DTO accepts MUST carry at least one validator
 * decorator (other than @IsOptional alone) — otherwise the field is either
 * silently stripped (whitelist) or the request is rejected (forbidNon-).
 *
 * For JSON-shaped fields (`howItWorks`, `inclusions`, `intakeFields`) we
 * use @IsArray() here to satisfy the pipe; the deep per-item shape check
 * happens in `intake-validation.ts` once the request reaches the service.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateServiceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(SLUG_RE, { message: 'slug must be lowercase kebab-case (e.g. diet-consult)' })
  @MaxLength(80)
  slug: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional() @IsString()
  tagline?: string;

  @IsOptional() @IsString()
  description?: string;

  // [{step, title, body}] — deep shape not enforced here
  @IsOptional() @IsArray()
  howItWorks?: unknown[];

  // string[] of inclusions
  @IsOptional() @IsArray()
  inclusions?: unknown[];

  @IsOptional() @IsString()
  iconName?: string;

  @IsOptional() @IsString()
  cardImageUrl?: string;

  // FieldDef[] — required for create; per-item shape validated in intake-validation.ts
  @IsArray()
  @ArrayNotEmpty({ message: 'At least one intake field is required' })
  intakeFields: unknown[];

  @IsOptional() @IsNumber() @Min(0)
  price?: number;

  @IsOptional() @IsInt()
  displayOrder?: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'At least one routing speciality is required' })
  @IsInt({ each: true })
  specialityIds: number[];
}

export class UpdateServiceDto {
  @IsOptional() @IsString()
  @Matches(SLUG_RE, { message: 'slug must be lowercase kebab-case' })
  slug?: string;

  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;

  @IsOptional() @IsArray() howItWorks?: unknown[];
  @IsOptional() @IsArray() inclusions?: unknown[];

  @IsOptional() @IsString() iconName?: string;
  @IsOptional() @IsString() cardImageUrl?: string;

  @IsOptional() @IsArray() intakeFields?: unknown[];

  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() displayOrder?: number;

  @IsOptional() @IsArray() @IsInt({ each: true })
  specialityIds?: number[];
}

export class ToggleServiceDto {
  @IsBoolean()
  isEnabled: boolean;
}
