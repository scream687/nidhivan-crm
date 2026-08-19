import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * These endpoints are unauthenticated, so this is the only place the payload is
 * checked. Previously the handlers took an inline object type, which gives the
 * global ValidationPipe no metadata to work with — nothing was validated and
 * `whitelist` had nothing to strip.
 */
export class PublicLeadDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  // Indian mobile numbers, optionally +91 prefixed.
  @IsString()
  @Matches(/^(\+91[-\s]?)?[6-9]\d{9}$/, {
    message: 'phone must be a valid Indian mobile number',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  message?: string;
}

export class PublicVisitRequestDto extends PublicLeadDto {
  @IsOptional()
  @IsISO8601()
  preferredDate?: string;
}
