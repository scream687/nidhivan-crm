import { LeadSource } from '@prisma/client';

/** URL slug → portal definition. These are the values allowed in /integrations/leads/:source */
export type PortalSlug = 'housing' | '99acres' | 'magicbricks' | 'webflow';

export interface PortalDefinition {
  /** IntegrationConfig.type — the row holding this portal's secret and field map */
  configType: string;
  leadSource: LeadSource;
  label: string;
  /**
   * Payload keys to try for each CRM field, in order. Portals are inconsistent
   * about casing and naming between their docs and what they actually POST, so
   * every realistic spelling is listed rather than assumed.
   */
  fieldCandidates: Record<string, string[]>;
}

const COMMON_NAME = ['name', 'Name', 'full_name', 'fullName', 'FullName', 'contact_name', 'ContactName', 'CONTACT NAME'];
const COMMON_PHONE = ['phone', 'Phone', 'mobile', 'Mobile', 'contact_number', 'ContactNumber', 'phone_number', 'phoneNumber', 'Mobile Number', 'MOBILE NUMBER'];
const COMMON_EMAIL = ['email', 'Email', 'email_address', 'emailAddress', 'EmailAddress'];
const COMMON_CITY = ['city', 'City', 'location', 'Location'];

export const PORTALS: Record<PortalSlug, PortalDefinition> = {
  housing: {
    configType: 'HOUSING_COM',
    leadSource: LeadSource.HOUSING_COM,
    label: 'Housing.com',
    fieldCandidates: {
      name: COMMON_NAME,
      phone: COMMON_PHONE,
      email: COMMON_EMAIL,
      city: COMMON_CITY,
      projectInterest: ['project_name', 'projectName', 'ProjectName', 'project', 'listing_name'],
      requirements: ['message', 'Message', 'requirement', 'comments'],
    },
  },
  '99acres': {
    configType: 'NINETYNINE_ACRES',
    leadSource: LeadSource.NINETYNINE_ACRES,
    label: '99acres',
    fieldCandidates: {
      name: COMMON_NAME,
      phone: [...COMMON_PHONE, 'MobileNumber'],
      email: COMMON_EMAIL,
      city: COMMON_CITY,
      projectInterest: ['ProjectName', 'projectName', 'project_name', 'property_name', 'PropertyName'],
      requirements: ['message', 'Message', 'Query', 'query', 'Requirement'],
    },
  },
  magicbricks: {
    configType: 'MAGICBRICKS',
    leadSource: LeadSource.MAGICBRICKS,
    label: 'MagicBricks',
    fieldCandidates: {
      name: COMMON_NAME,
      phone: COMMON_PHONE,
      email: COMMON_EMAIL,
      city: COMMON_CITY,
      projectInterest: ['projectName', 'project_name', 'ProjectName', 'property'],
      requirements: ['message', 'Message', 'comments'],
    },
  },
  webflow: {
    configType: 'WEBFLOW',
    leadSource: LeadSource.WEBSITE,
    label: 'Webflow',
    fieldCandidates: {
      name: COMMON_NAME,
      phone: COMMON_PHONE,
      email: COMMON_EMAIL,
      city: COMMON_CITY,
      projectInterest: ['project', 'Project', 'project_name'],
      requirements: ['message', 'Message', 'comments'],
    },
  },
};

export function isPortalSlug(value: string): value is PortalSlug {
  return Object.prototype.hasOwnProperty.call(PORTALS, value);
}

/** Wrapper keys portals commonly nest the actual lead under. */
const WRAPPER_KEYS = ['lead', 'Lead', 'data', 'Data', 'payload', 'enquiry', 'Enquiry', 'fields', 'formData'];

/**
 * Portals variously POST the lead at the top level or nested one level deep.
 * Merge any known wrapper up so field lookup only has to handle one shape.
 */
export function flattenPayload(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const flat: Record<string, unknown> = { ...root };

  for (const key of WRAPPER_KEYS) {
    const nested = root[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      Object.assign(flat, nested as Record<string, unknown>);
    }
  }

  return flat;
}

/**
 * Resolve one CRM field from a payload. An admin-configured mapping wins over
 * the built-in candidates, so a portal that renames a field can be fixed from
 * the Integrations screen without a deploy.
 */
export function resolveField(
  payload: Record<string, unknown>,
  crmField: string,
  candidates: string[],
  fieldMap?: Record<string, string> | null,
): string {
  const configured = fieldMap?.[crmField];
  const keys = configured ? [configured, ...candidates] : candidates;

  for (const key of keys) {
    const value = payload[key];
    if (value === null || value === undefined) continue;
    const str = String(value).trim();
    if (str) return str;
  }

  return '';
}

/** Indian mobile numbers arrive as +91-XXXXX, 0091XXXXX, "98765 43210", etc. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 13 && digits.startsWith('091')) return digits.slice(3);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
