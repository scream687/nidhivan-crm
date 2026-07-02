import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
} from "class-validator";
import { LeadSource, InvestmentPurpose } from "@prisma/client";

export class UpdateLeadDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsNumber() budget?: number;
  @IsOptional() @IsNumber() budgetMin?: number;
  @IsOptional() @IsNumber() budgetMax?: number;
  @IsOptional()
  @IsEnum(InvestmentPurpose)
  investmentPurpose?: InvestmentPurpose;
  @IsOptional() @IsString() projectInterest?: string;
  @IsOptional() @IsEnum(LeadSource) source?: LeadSource;
  @IsOptional() @IsString() stage?: string;
  @IsOptional() @IsBoolean() isHot?: boolean;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsArray() tags?: string[];
  @IsOptional() @IsString() lostReason?: string;
  @IsOptional() @IsString() lostNotes?: string;
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
  @IsOptional() @IsString() bookingStatus?: string;
}

export class ChangeStageDto {
  @IsString() stage = '';
  @IsOptional() @IsString() reason?: string;
}

export class AssignLeadDto {
  @IsString() assignedToId = '';
}
