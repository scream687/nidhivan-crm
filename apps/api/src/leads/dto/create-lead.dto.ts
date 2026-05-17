import { IsString, IsOptional, IsEmail, IsEnum, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { LeadSource, InvestmentPurpose } from '@prisma/client';

export class CreateLeadDto {
  @IsString() name: string;
  @IsString() phone: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsNumber() budgetMin?: number;
  @IsOptional() @IsNumber() budgetMax?: number;
  @IsOptional() @IsEnum(InvestmentPurpose) investmentPurpose?: InvestmentPurpose;
  @IsOptional() @IsString() projectInterest?: string;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsString() nextFollowUpAt?: string;
  @IsOptional() @IsString() nextFollowUpInfo?: string;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() siteLocation?: string;
  @IsOptional() @IsString() siteVisitDate?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() registryDoneDate?: string;
  @IsOptional() @IsString() leadTitle?: string;
  @IsOptional() @IsString() campaignName?: string;
  @IsOptional() @IsString() campaignTeam?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() utmSource?: string;
  @IsOptional() @IsString() utmMedium?: string;
  @IsOptional() @IsString() utmCampaign?: string;
  @IsOptional() @IsString() landingPage?: string;
  @IsOptional() @IsString() facebookLeadId?: string;
  @IsOptional() @IsString() facebookFormId?: string;
}
