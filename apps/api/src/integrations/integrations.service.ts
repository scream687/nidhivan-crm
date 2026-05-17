import { Injectable, Logger } from '@nestjs/common';
import { LeadsService } from '../leads/leads.service';
import { PrismaService } from '../prisma/prisma.service';
import { LeadSource } from '@prisma/client';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private leads: LeadsService,
    private prisma: PrismaService,
  ) {}

  async handleWebflowLead(payload: any) {
    this.logger.log('Received Webflow lead:', payload);

    const dto = {
      name: payload.name || payload['Name'] || 'Webflow Lead',
      phone: payload.phone || payload['Phone'] || payload['Mobile'] || '',
      email: payload.email || payload['Email'] || '',
      city: payload.city || payload['City'] || '',
      source: LeadSource.WEBSITE,
      projectInterest: payload.project || payload['Project'] || '',
    };

    if (!dto.phone) {
      this.logger.warn('Webflow lead missing phone number, skipping...');
      return;
    }

    return this.leads.create(dto as any, 'system');
  }

  async handleFacebookLead(payload: any) {
    this.logger.log('Received Facebook lead webhook');

    const entry = payload.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    if (!value) return { status: 'no_value' };

    const leadgenId = value.leadgen_id;
    if (!leadgenId) return { status: 'no_leadgen_id' };

    // Fetch the config from DB to get the page access token
    const config = await this.prisma.integrationConfig.findFirst({
      where: { type: 'FACEBOOK' },
    });
    const accessToken = config?.accessToken || process.env.FB_PAGE_ACCESS_TOKEN;
    if (!accessToken) {
      this.logger.warn('Facebook access token not configured, cannot fetch lead data');
      return { status: 'no_token' };
    }

    // Fetch lead data from Graph API
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${accessToken}`,
    );
    const leadData: any = await response.json();
    if (!response.ok || leadData.error) {
      this.logger.error('FB Graph API error', leadData);
      return { status: 'api_error' };
    }

    // leadData.field_data is an array of { name, values: [value] }
    const fields: Record<string, string> = {};
    for (const f of leadData.field_data || []) {
      fields[f.name] = f.values?.[0] || '';
    }

    const dto = {
      name: fields['full_name'] || fields['name'] || 'Facebook Lead',
      phone: fields['phone_number'] || fields['phone'] || '',
      email: fields['email'] || '',
      source: LeadSource.FACEBOOK,
      facebookLeadId: leadgenId,
      facebookFormId: value.form_id,
      facebookAdId: value.ad_id,
      facebookCampaignId: value.campaign_id,
      city: fields['city'] || fields['location'] || '',
      projectInterest: fields['project'] || fields['interested_in'] || '',
    };

    return this.leads.create(dto as any, 'system');
  }

  async getIntegrationConfig(type: string) {
    return this.prisma.integrationConfig.findUnique({ where: { type } });
  }

  async upsertIntegrationConfig(
    type: string,
    data: { accessToken?: string; metadata?: any },
  ) {
    return this.prisma.integrationConfig.upsert({
      where: { type },
      update: data,
      create: { type, ...data },
    });
  }
}
