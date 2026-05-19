import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, Min, Max } from 'class-validator';

export class CreateCaseDto {
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;

  @IsOptional()
  @IsInt()
  durationValue?: number;

  @IsOptional()
  @IsString()
  durationUnit?: string;

  @IsOptional()
  @IsString()
  previousTreatments?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  pastIllnesses?: string;

  @IsArray()
  @IsInt({ each: true })
  specialityIds: number[];
}

export class UpdateCaseDto {
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsInt()
  durationValue?: number;

  @IsOptional()
  @IsString()
  durationUnit?: string;

  @IsOptional()
  @IsString()
  previousTreatments?: string;

  @IsOptional()
  @IsString()
  familyHistory?: string;

  @IsOptional()
  @IsString()
  pastIllnesses?: string;

  @IsOptional()
  @IsArray()
  specialityIds?: number[];

  // Constitutional Profile (Phase 2)
  @IsOptional()
  @IsArray()
  temperament?: string[];

  @IsOptional()
  @IsArray()
  fears?: string[];

  @IsOptional()
  @IsString()
  sleepPosition?: string;

  @IsOptional()
  @IsString()
  sleepDreams?: string;

  @IsOptional()
  @IsString()
  sleepQuality?: string;

  @IsOptional()
  @IsString()
  sleepDisturbances?: string;

  @IsOptional()
  @IsString()
  emotionalTriggers?: string;

  @IsOptional()
  @IsString()
  consolationResponse?: string;

  @IsOptional()
  @IsArray()
  foodCravings?: string[];

  @IsOptional()
  @IsArray()
  foodAversions?: string[];

  @IsOptional()
  @IsString()
  thermalPreference?: string;

  @IsOptional()
  @IsString()
  thirstQuantity?: string;

  @IsOptional()
  @IsString()
  thirstFrequency?: string;

  @IsOptional()
  @IsString()
  thirstTempPref?: string;

  @IsOptional()
  @IsString()
  perspirationLocation?: string;

  @IsOptional()
  @IsString()
  perspirationTiming?: string;

  @IsOptional()
  @IsString()
  perspirationOdour?: string;

  @IsOptional()
  modalities?: any;
}

export class SubmitCaseDto {
  // Just triggers submission — case must be complete
}

export class AddDocumentLabelDto {
  @IsString()
  @IsNotEmpty()
  label: string;
}
