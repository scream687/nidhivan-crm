import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
}
