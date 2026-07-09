import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CommunicationService } from './communication.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('communication')
@UseGuards(AuthGuard('jwt'))
export class CommunicationController {
  constructor(private communication: CommunicationService) {}

  @Get('timeline/:leadId')
  getTimeline(
    @Param('leadId') leadId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('types') types?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.communication.getLeadTimeline(leadId, {
      cursor,
      limit: limit ? parseInt(limit, 10) : undefined,
      types: types ? types.split(',') : undefined,
      search,
      from,
      to,
    });
  }

  @Get('inbox')
  getInbox(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.communication.getUnifiedInbox(userId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
  }

  @Get('unread')
  getUnread(@CurrentUser('id') userId: string) {
    return this.communication.getUnreadCount(userId);
  }
}
