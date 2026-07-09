import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FollowUpService } from './follow-up.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('follow-ups')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class FollowUpController {
  constructor(private service: FollowUpService) {}

  @Get('pending')
  pending(@CurrentUser('id') userId: string, @Query('date') date?: string) {
    return this.service.getPendingFollowUps(userId, date);
  }

  @Get('overdue')
  overdue(@CurrentUser('id') userId: string) {
    return this.service.getOverdueFollowUps(userId);
  }

  @Get('escalations')
  escalations(@Query('level') level?: string) {
    return this.service.getEscalations(level ? parseInt(level, 10) : undefined);
  }

  @Post(':taskId/schedule')
  schedule(
    @Param('taskId') taskId: string,
    @Body() body: { reminderAt: string; type?: string; note?: string },
  ) {
    return this.service.scheduleReminder(taskId, new Date(body.reminderAt), body.type, body.note);
  }

  @Delete(':taskId/reminder')
  cancelReminder(@Param('taskId') taskId: string) {
    return this.service.cancelReminder(taskId);
  }

  @Post(':taskId/mark-done')
  markDone(@Param('taskId') taskId: string) {
    return this.service.markDone(taskId);
  }

  @Post(':taskId/escalate')
  escalate(@Param('taskId') taskId: string) {
    return this.service.escalate(taskId);
  }
}
