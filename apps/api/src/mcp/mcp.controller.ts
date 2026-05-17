import { Body, Controller, Delete, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpService } from './mcp.service';

type McpRequest = Request & { mcpUserId?: string };

@Controller('mcp')
@UseGuards(McpAuthGuard)
export class McpController {
  constructor(private readonly mcpService: McpService) {}

  @Post()
  async handlePost(
    @Req() request: McpRequest,
    @Res() response: Response,
    @Body() body?: unknown,
  ): Promise<void> {
    await this.mcpService.handleRequest(
      request.mcpUserId!,
      request,
      response,
      body,
    );
  }

  @Get()
  handleGet(@Res() response: Response): void {
    this.mcpService.methodNotAllowed(response);
  }

  @Delete()
  handleDelete(@Res() response: Response): void {
    this.mcpService.methodNotAllowed(response);
  }
}