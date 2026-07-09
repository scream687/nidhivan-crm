import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { InventoryService } from './inventory.service';

function projectStorage(fieldSuffix: string) {
  return diskStorage({
    destination: (req, _file, cb) => {
      const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = raw.replace(/\.\.(\/|\\)/g, '').replace(/^\//, '');
      const dir = join(process.cwd(), 'public', 'uploads', 'projects', id);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const unique = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      cb(null, `${fieldSuffix}-${unique}${extname(file.originalname).toLowerCase()}`);
    },
  });
}

@Controller('inventory')
@UseGuards(AuthGuard('jwt'))
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() body: {
    name: string; type?: string; location: string; city?: string;
    totalUnits: number; available?: number; pricePerSqft?: number;
    priceMin?: number; priceMax?: number; reraNumber?: string;
    description?: string; amenities?: string[]; highlights?: string[];
    videoUrl?: string; possession?: string; masterPlanUrl?: string;
    virtualTourUrl?: string; nearbyPlaces?: any; googleMapsEmbed?: string;
  }) {
    return this.inventoryService.create(body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() body: Partial<{
    name: string; type: string; location: string; city: string;
    totalUnits: number; available: number; blocked: number;
    booked: number; sold: number; pricePerSqft: number;
    priceMin: number; priceMax: number; reraNumber: string;
    description: string; isActive: boolean; amenities: string[];
    highlights: string[]; videoUrl: string; possession: string;
    masterPlanUrl: string; virtualTourUrl: string; nearbyPlaces: any;
    googleMapsEmbed: string;
  }>) {
    return this.inventoryService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }

  @Post(':id/upload-image')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', {
    storage: projectStorage('img'),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new BadRequestException('Only images allowed'), false);
      cb(null, true);
    },
  }))
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/projects/${id}/${file.filename}`;
    const project = await this.inventoryService.addImage(id, url);
    return { url, project };
  }

  @Delete(':id/images')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  async removeImage(@Param('id') id: string, @Query('url') url: string) {
    if (!url) throw new BadRequestException('url query param required');
    return this.inventoryService.removeImage(id, url);
  }

  @Post(':id/upload-brochure')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('file', {
    storage: projectStorage('brochure'),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype !== 'application/pdf') return cb(new BadRequestException('Only PDF allowed'), false);
      cb(null, true);
    },
  }))
  async uploadBrochure(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = `/uploads/projects/${id}/${file.filename}`;
    const project = await this.inventoryService.setBrochure(id, url);
    return { url, project };
  }

  @Post(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  publish(@Param('id') id: string) {
    return this.inventoryService.publish(id);
  }

  @Delete(':id/publish')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  unpublish(@Param('id') id: string) {
    return this.inventoryService.unpublish(id);
  }

  // ── Plot routes ──────────────────────────────────────────────────────────────

  @Get(':id/plots')
  getPlots(@Param('id') projectId: string, @Query() filters: {
    status?: string; facing?: string; block?: string;
    priceMin?: string; priceMax?: string;
  }) {
    return this.inventoryService.getPlots(projectId, {
      ...filters,
      priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
      priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    });
  }

  @Get(':id/details')
  getProjectDetails(@Param('id') id: string) {
    return this.inventoryService.getProjectDetails(id);
  }

  @Get('plots/:plotId')
  getPlot(@Param('plotId') plotId: string) {
    return this.inventoryService.getPlot(plotId);
  }

  @Post(':id/plots')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  createPlot(@Param('id') projectId: string, @Body() body: {
    plotNumber: string; block?: string; road?: string; facing?: string;
    dimensions?: string; area?: number; areaUnit?: string;
    ratePerUnit?: number; totalPrice?: number; status?: string;
    isCorner?: boolean; isAvenue?: boolean; roadWidth?: string;
    gpsLatitude?: number; gpsLongitude?: number;
  }) {
    return this.inventoryService.createPlot(projectId, body);
  }

  @Patch('plots/:plotId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  updatePlot(@Param('plotId') plotId: string, @Body() body: Partial<{
    plotNumber: string; block: string; road: string; facing: string;
    dimensions: string; area: number; areaUnit: string;
    ratePerUnit: number; totalPrice: number; status: string;
    isCorner: boolean; isAvenue: boolean; roadWidth: string;
    gpsLatitude: number; gpsLongitude: number; isPublished: boolean;
  }>) {
    return this.inventoryService.updatePlot(plotId, body);
  }

  @Delete('plots/:plotId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  deletePlot(@Param('plotId') plotId: string) {
    return this.inventoryService.deletePlot(plotId);
  }

  @Post(':id/plots/bulk')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  bulkCreatePlots(@Param('id') projectId: string, @Body() body: { plots: Array<{
    plotNumber: string; block?: string; road?: string; facing?: string;
    dimensions?: string; area?: number; areaUnit?: string;
    ratePerUnit?: number; totalPrice?: number; status?: string;
    isCorner?: boolean; isAvenue?: boolean; roadWidth?: string;
  }> }) {
    return this.inventoryService.bulkCreatePlots(projectId, body.plots);
  }

  @Patch('plots/:plotId/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  updatePlotStatus(@Param('plotId') plotId: string, @Body('status') status: string) {
    return this.inventoryService.updatePlotStatus(plotId, status);
  }
}
