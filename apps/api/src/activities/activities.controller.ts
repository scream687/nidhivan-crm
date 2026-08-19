import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivitiesService } from './activities.service';
import { R2Service } from '../common/services/r2.service';
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
  constructor(
    private activities: ActivitiesService,
    private r2: R2Service,
  ) {}

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
    storage: memoryStorage(),
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
    const key = this.r2.buildKey(`voice/leads/${leadId}`, file.originalname, 'note');
    await this.r2.upload(key, file.buffer, file.mimetype);
    const url = await this.r2.urlFor(key);
    return this.activities.addVoiceNoteActivity(leadId, userId, url, duration ? parseFloat(duration) : undefined);
  }
}
