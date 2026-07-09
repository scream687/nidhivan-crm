import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { ActivitiesService } from './activities.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('leads/:leadId')
@UseGuards(AuthGuard('jwt'))
export class ActivitiesController {
  constructor(private activities: ActivitiesService) {}

  @Get('timeline')
  getTimeline(@Param('leadId') leadId: string) {
    return this.activities.getTimeline(leadId);
  }

  @Post('notes')
  addNote(@Param('leadId') leadId: string, @Body('content') content: string, @CurrentUser('id') userId: string) {
    return this.activities.addNote(leadId, content, userId);
  }

  @Get('tasks')
  getTasks(@Param('leadId') leadId: string) {
    return this.activities.getTasksByLeadId(leadId);
  }

  @Post('tasks')
  createTask(@Param('leadId') leadId: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.activities.createTask(leadId, body, userId);
  }

  @Patch('tasks/:taskId/complete')
  completeTask(@Param('taskId') taskId: string, @CurrentUser('id') userId: string) {
    return this.activities.completeTask(taskId, userId);
  }
}

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private activities: ActivitiesService) {}

  @Get()
  getAllTasks(
    @CurrentUser() user: any,
    @Query('isCompleted') isCompleted?: string,
  ) {
    const isCompletedBool =
      isCompleted === 'true' ? true : isCompleted === 'false' ? false : undefined;
    return this.activities.getAllTasks(user, isCompletedBool);
  }

  @Post()
  createStandaloneTask(@Body() body: any) {
    return this.activities.createStandaloneTask(body);
  }

  @Patch(':taskId/complete')
  completeTask(@Param('taskId') taskId: string, @CurrentUser('id') userId: string) {
    return this.activities.completeTaskById(taskId, userId);
  }
}

@Controller('activities')
@UseGuards(AuthGuard('jwt'))
export class GlobalActivitiesController {
  constructor(private activities: ActivitiesService) {}

  @Get()
  getAllActivities(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('leadId') leadId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.activities.getAllActivities(user, {
      type,
      leadId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post(':leadId/voice-note')
  @UseInterceptors(FileInterceptor('audio', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        const dir = join(process.cwd(), 'public', 'uploads', 'voice');
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        cb(null, dir);
      },
      filename: (_req, file, cb) => {
        const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        cb(null, name);
      },
    }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('audio/')) return cb(new BadRequestException('Only audio files allowed'), false);
      cb(null, true);
    },
  }))
  async addVoiceNote(
    @Param('leadId') leadId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Body('duration') duration?: string,
  ) {
    if (!file) throw new BadRequestException('No audio file uploaded');
    const url = `/uploads/voice/${file.filename}`;
    return this.activities.addVoiceNoteActivity(leadId, userId, url, duration ? parseFloat(duration) : undefined);
  }
}
