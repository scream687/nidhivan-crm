import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  async findProjectBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, isPublished: true, isActive: true },
    });
    if (!project) throw new NotFoundException('Project not found or not published');
    return project;
  }

  async createVisitRequest(
    slug: string,
    data: { name: string; phone: string; email?: string; preferredDate?: string; message?: string },
  ) {
    const project = await this.prisma.project.findFirst({
      where: { slug, isPublished: true, isActive: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.siteVisitRequest.create({
      data: {
        projectId: project.id,
        name: data.name,
        phone: data.phone,
        email: data.email,
        preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
        message: data.message,
      },
    });

    return { success: true };
  }

  async getLandingPage(slug: string) {
    const page = await this.prisma.landingPage.findUnique({
      where: { slug },
      include: {
        project: {
          select: {
            id: true, name: true, slug: true, type: true, location: true, city: true,
            description: true, images: true, amenities: true, highlights: true,
            priceMin: true, priceMax: true, reraNumber: true, brochureUrl: true,
            videoUrl: true, masterPlanUrl: true, virtualTourUrl: true,
            googleMapsEmbed: true, nearbyPlaces: true,
          },
        },
      },
    });
    if (!page) throw new NotFoundException('Landing page not found');
    if (!page.isActive) throw new NotFoundException('Landing page is not active');

    await this.prisma.landingPage.update({
      where: { id: page.id },
      data: { visitorCount: { increment: 1 } },
    });

    const plotSummary = await this.prisma.plot.groupBy({
      by: ['status'],
      where: { projectId: page.projectId, isPublished: true },
      _count: { id: true },
    });

    return { ...page, plotSummary };
  }

  async submitLandingPageLead(
    slug: string,
    data: { name: string; phone: string; email?: string; message?: string },
  ) {
    const page = await this.prisma.landingPage.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Landing page not found');
    if (!page.isActive) throw new BadRequestException('Landing page is not active');

    const leadNumber = `LP-${Date.now().toString(36).toUpperCase()}`;

    await this.prisma.lead.create({
      data: {
        leadNumber,
        name: data.name,
        phone: data.phone,
        email: data.email,
        description: data.message,
        source: 'WEBSITE',
        landingPageId: page.id,
        landingPage: slug,
        projectInterest: page.projectId,
        createdById: page.projectId,
      },
    });

    await this.prisma.landingPage.update({
      where: { id: page.id },
      data: { leadsGenerated: { increment: 1 } },
    });

    return { success: true, leadNumber };
  }
}
