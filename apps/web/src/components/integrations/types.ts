export type FieldMap = Record<string, string>;

export interface IntegrationStatus {
  type: string;
  configured: boolean;
  hasSecret: boolean;
  /** Built by the API so the screen shows exactly what gets emailed to the portal. */
  webhookUrl: string | null;
  accountManagerEmail: string | null;
  setupEmailSentAt: string | null;
  lastLeadAt: string | null;
  leadCount30d: number;
  lastDelivery: { status: string; createdAt: string; error: string | null } | null;
}

export interface WebhookDelivery {
  id: string;
  source: string;
  status: 'created' | 'duplicate' | 'rejected' | 'error';
  payload: unknown;
  error: string | null;
  leadId: string | null;
  createdAt: string;
}

/** One card on the Integrations screen. */
export interface IntegrationDef {
  /** URL slug used by POST /integrations/leads/:slug — null for Facebook, which has its own route */
  slug: string | null;
  /** IntegrationConfig.type, and the key used for status and delivery lookups */
  configType: string;
  name: string;
  description: string;
  docsUrl: string;
  /** CRM field → human label, shown in the field mapping dialog */
  crmFields: { field: string; label: string; builtIn: string }[];
  /** What to tell the portal's account manager */
  setupNote: string;
}

export const CRM_FIELD_LABELS: Record<string, string> = {
  name: 'Name',
  phone: 'Phone',
  email: 'Email',
  city: 'City',
  projectInterest: 'Project interest',
  requirements: 'Requirements / message',
};
