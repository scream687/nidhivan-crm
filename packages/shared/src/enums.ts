export enum Role {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SALES_AGENT = 'SALES_AGENT',
  TELECALLER = 'TELECALLER',
  MARKETING = 'MARKETING',
  ACCOUNTANT = 'ACCOUNTANT',
}

export enum LeadStage {
  NEW = 'NEW',
  ATTEMPTED = 'ATTEMPTED',
  CONNECTED = 'CONNECTED',
  INTERESTED = 'INTERESTED',
  HOT = 'HOT',
  SITE_VISIT_SCHEDULED = 'SITE_VISIT_SCHEDULED',
  SITE_VISIT_COMPLETED = 'SITE_VISIT_COMPLETED',
  NEGOTIATION = 'NEGOTIATION',
  BOOKING_PENDING = 'BOOKING_PENDING',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
  FUTURE_PROSPECT = 'FUTURE_PROSPECT',
}

export enum LeadSource {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  HOUSING_COM = 'HOUSING_COM',
  NINETYNINE_ACRES = 'NINETYNINE_ACRES',
  BROKER_REFERRAL = 'BROKER_REFERRAL',
  WALK_IN = 'WALK_IN',
  WHATSAPP = 'WHATSAPP',
  WEBSITE = 'WEBSITE',
  GOOGLE_ADS = 'GOOGLE_ADS',
  OTHER = 'OTHER',
}

export enum InvestmentPurpose {
  SELF_USE = 'SELF_USE',
  INVESTMENT = 'INVESTMENT',
  BOTH = 'BOTH',
}

export enum ActivityType {
  NOTE = 'NOTE',
  CALL = 'CALL',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SITE_VISIT = 'SITE_VISIT',
  TASK = 'TASK',
  STAGE_CHANGE = 'STAGE_CHANGE',
  ASSIGNMENT = 'ASSIGNMENT',
  SYSTEM = 'SYSTEM',
}

export enum CallType {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

export enum CallStatus {
  INITIATED = 'INITIATED',
  RINGING = 'RINGING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  BUSY = 'BUSY',
  NO_ANSWER = 'NO_ANSWER',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum SlaStatus {
  FIRST_RESPONSE_DUE = 'FIRST_RESPONSE_DUE',
  ROLLING_RESPONSE_DUE = 'ROLLING_RESPONSE_DUE',
  FAILED = 'FAILED',
  FULFILLED = 'FULFILLED',
}

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  [LeadStage.NEW]: 'New',
  [LeadStage.ATTEMPTED]: 'Attempted',
  [LeadStage.CONNECTED]: 'Connected',
  [LeadStage.INTERESTED]: 'Interested',
  [LeadStage.HOT]: 'Hot',
  [LeadStage.SITE_VISIT_SCHEDULED]: 'Site Visit Scheduled',
  [LeadStage.SITE_VISIT_COMPLETED]: 'Site Visit Completed',
  [LeadStage.NEGOTIATION]: 'Negotiation',
  [LeadStage.BOOKING_PENDING]: 'Booking Pending',
  [LeadStage.CLOSED_WON]: 'Closed Won',
  [LeadStage.CLOSED_LOST]: 'Closed Lost',
  [LeadStage.FUTURE_PROSPECT]: 'Future Prospect',
};

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  [LeadSource.FACEBOOK]: 'Facebook',
  [LeadSource.INSTAGRAM]: 'Instagram',
  [LeadSource.HOUSING_COM]: 'Housing.com',
  [LeadSource.NINETYNINE_ACRES]: '99Acres',
  [LeadSource.BROKER_REFERRAL]: 'Broker Referral',
  [LeadSource.WALK_IN]: 'Walk-In',
  [LeadSource.WHATSAPP]: 'WhatsApp',
  [LeadSource.WEBSITE]: 'Website',
  [LeadSource.GOOGLE_ADS]: 'Google Ads',
  [LeadSource.OTHER]: 'Other',
};
