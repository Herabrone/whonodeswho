import { Body, Controller, Delete, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { PersistedState } from '@relationflow/contracts';
import type { Request } from 'express';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { GraphService } from './graph.service';

type SessionRequest = Request & { session: Request['session'] & { userId?: string } };

@Controller('graph')
@UseGuards(SessionAuthGuard)
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  getGraph(@Req() request: SessionRequest): Promise<PersistedState> {
    return this.graphService.getGraph(request.session.userId!);
  }

  @Put()
  saveGraph(
    @Req() request: SessionRequest,
    @Body() payload: unknown,
  ): Promise<PersistedState> {
    return this.graphService.saveGraph(request.session.userId!, payload);
  }

  @Delete()
  clearGraph(@Req() request: SessionRequest): Promise<PersistedState> {
    return this.graphService.clearGraph(request.session.userId!);
  }
}
