import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfirmationModule } from '../confirmation/confirmation.module';
import { GraphToolsModule } from '../graph-tools/graph-tools.module';
import { McpAuthGuard } from './mcp-auth.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

@Module({
  imports: [JwtModule.register({}), GraphToolsModule, ConfirmationModule],
  controllers: [McpController],
  providers: [McpService, McpAuthGuard],
})
export class McpModule {}