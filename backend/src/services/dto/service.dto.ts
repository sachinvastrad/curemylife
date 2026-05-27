import {
  IsString, IsNotEmpty, IsOptional, IsArray, IsInt, IsBoolean,
  IsNumber, Min, Matches, MaxLength,
} from 'class-validator';

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

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  howItWorks?: unknown;   // [{step, title, body}] — validated as JSON

  @IsOptional()
  inclusions?: unknown;   // string[]

  @IsOptional()
  @IsString()
  iconName?: string;

  @IsOptional()
  @IsString()
  cardImageUrl?: string;

  // FieldDef[] — required for save; deeper validation in intake-validation.ts
  intakeFields: unknown;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsArray()
  @IsInt({ each: true })
  specialityIds: number[];
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @Matches(SLUG_RE, { message: 'slug must be lowercase kebab-case' })
  slug?: string;

  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() tagline?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() howItWorks?: unknown;
  @IsOptional() inclusions?: unknown;
  @IsOptional() @IsString() iconName?: string;
  @IsOptional() @IsString() cardImageUrl?: string;
  @IsOptional() intakeFields?: unknown;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() displayOrder?: number;
  @IsOptional() @IsArray() @IsInt({ each: true }) specialityIds?: number[];
}

export class ToggleServiceDto {
  @IsBoolean()
  isEnabled: boolean;
}
