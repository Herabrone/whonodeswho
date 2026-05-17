import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { ConfirmActionResponse } from '@relationflow/contracts';
import type { Request } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { GraphToolsService } from '../graph-tools/graph-tools.service';
import { ConfirmationService } from './confirmation.service';
import { ConfirmActionDto } from './dto/confirm-action.dto';

type SessionRequest = Request & {
  session: Request['session'] & { userId?: string };
};

@Controller('actions')
@UseGuards(SessionAuthGuard)
export class ActionsController {
  constructor(
    private readonly confirmationService: ConfirmationService,
    private readonly graphTools: GraphToolsService,
  ) {}

  @Post('confirm')
  async confirm(
    @Body() dto: ConfirmActionDto,
    @Req() request: SessionRequest,
  ): Promise<ConfirmActionResponse> {
    const action = this.confirmationService.verify(dto.token);
    return this.graphTools.executeAction(request.session.userId!, action);
  }
}
