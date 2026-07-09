import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as path from 'path';
import * as fs from 'fs';

function generateSlug(name: string, suffix = ''): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
  return suffix ? `${base}-${suffix}` : base;
}

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.project.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async create(data: {
    name: string; type?: string; location: string; city?: string;
    totalUnits: number; available?: number; pricePerSqft?: number;
    priceMin?: number; priceMax?: number; reraNumber?: string;
    description?: string; amenities?: string[]; highlights?: string[];
    videoUrl?: string; possession?: string; masterPlanUrl?: string;
    virtualTourUrl?: string; nearbyPlaces?: any; googleMapsEmbed?: string;
  }) {
    let slug = generateSlug(data.name);
    const existing = await this.prisma.project.findUnique({ where: { slug } });
    if (existing) {
      slug = generateSlug(data.name, Date.now().toString(36));
    }

    return this.prisma.project.create({
      data: {
        name: data.name,
        slug,
        type: data.type || 'PLOT',
        location: data.location,
        city: data.city || '',
        totalUnits: data.totalUnits,
        available: data.available ?? data.totalUnits,
        pricePerSqft: data.pricePerSqft ?? undefined,
        priceMin: data.priceMin ?? undefined,
        priceMax: data.priceMax ?? undefined,
        reraNumber: data.reraNumber,
        description: data.description,
        amenities: data.amenities ?? [],
        highlights: data.highlights ?? [],
        videoUrl: data.videoUrl,
        possession: data.possession,
        masterPlanUrl: data.masterPlanUrl,
        virtualTourUrl: data.virtualTourUrl,
        nearbyPlaces: data.nearbyPlaces ?? undefined,
        googleMapsEmbed: data.googleMapsEmbed,
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string; type: string; location: string; city: string;
    totalUnits: number; available: number; blocked: number;
    booked: number; sold: number; pricePerSqft: number;
    priceMin: number; priceMax: number; reraNumber: string;
    description: string; isActive: boolean; amenities: string[];
    highlights: string[]; videoUrl: string; possession: string;
    masterPlanUrl: string; virtualTourUrl: string; nearbyPlaces: any;
    googleMapsEmbed: string;
  }>) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data });
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { isActive: false } });
  }

  async updateUnitStatus(id: string, status: 'available' | 'blocked' | 'booked' | 'sold', delta: number) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { [status]: { increment: delta } },
    });
  }

  async addImage(id: string, url: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({
      where: { id },
      data: { images: { push: url } },
    });
  }

  async removeImage(id: string, url: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    const images = project.images.filter(img => img !== url);

    const relativePath = url.replace(/^\/uploads\//, '');
    const filePath = path.join(process.cwd(), 'public', 'uploads', relativePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return this.prisma.project.update({ where: { id }, data: { images } });
  }

  async setBrochure(id: string, url: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { brochureUrl: url } });
  }

  async publish(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { isPublished: true } });
  }

  async unpublish(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.project.update({ where: { id }, data: { isPublished: false } });
  }

  // ── Plots ────────────────────────────────────────────────────────────────────

  async getPlots(projectId: string, filters?: {
    status?: string; facing?: string; block?: string;
    priceMin?: number; priceMax?: number;
  }) {
    const where: Prisma.PlotWhereInput = { projectId };
    if (filters?.status) where.status = filters.status;
    if (filters?.facing) where.facing = filters.facing;
    if (filters?.block) where.block = filters.block;
    if (filters?.priceMin !== undefined || filters?.priceMax !== undefined) {
      where.totalPrice = {};
      if (filters.priceMin !== undefined) where.totalPrice.gte = filters.priceMin;
      if (filters.priceMax !== undefined) where.totalPrice.lte = filters.priceMax;
    }
    return this.prisma.plot.findMany({ where, orderBy: [{ block: 'asc' }, { plotNumber: 'asc' }] });
  }

  async getPlot(id: string) {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) throw new NotFoundException('Plot not found');
    return plot;
  }

  async createPlot(projectId: string, data: {
    plotNumber: string; block?: string; road?: string; facing?: string;
    dimensions?: string; area?: number; areaUnit?: string;
    ratePerUnit?: number; totalPrice?: number; status?: string;
    isCorner?: boolean; isAvenue?: boolean; roadWidth?: string;
    gpsLatitude?: number; gpsLongitude?: number;
  }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.plot.create({ data: { ...data, projectId } });
  }

  async updatePlot(id: string, data: Partial<{
    plotNumber: string; block: string; road: string; facing: string;
    dimensions: string; area: number; areaUnit: string;
    ratePerUnit: number; totalPrice: number; status: string;
    isCorner: boolean; isAvenue: boolean; roadWidth: string;
    gpsLatitude: number; gpsLongitude: number; isPublished: boolean;
  }>) {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) throw new NotFoundException('Plot not found');
    return this.prisma.plot.update({ where: { id }, data });
  }

  async deletePlot(id: string) {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) throw new NotFoundException('Plot not found');
    return this.prisma.plot.delete({ where: { id } });
  }

  async bulkCreatePlots(projectId: string, plots: Array<{
    plotNumber: string; block?: string; road?: string; facing?: string;
    dimensions?: string; area?: number; areaUnit?: string;
    ratePerUnit?: number; totalPrice?: number; status?: string;
    isCorner?: boolean; isAvenue?: boolean; roadWidth?: string;
  }>) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');
    return this.prisma.plot.createMany({
      data: plots.map(p => ({ ...p, projectId })),
    });
  }

  async updatePlotStatus(id: string, status: string) {
    const plot = await this.prisma.plot.findUnique({ where: { id } });
    if (!plot) throw new NotFoundException('Plot not found');
    return this.prisma.plot.update({ where: { id }, data: { status } });
  }

  async getProjectDetails(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { plots: { orderBy: [{ block: 'asc' }, { plotNumber: 'asc' }] } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const counts = { AVAILABLE: 0, BLOCKED: 0, RESERVED: 0, BOOKED: 0, SOLD: 0 };
    for (const plot of project.plots) {
      const s = plot.status as keyof typeof counts;
      if (s in counts) counts[s]++;
    }

    return { ...project, plotCounts: counts };
  }
}
