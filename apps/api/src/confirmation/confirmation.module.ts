import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { GraphToolsModule } from '../graph-tools/graph-tools.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ActionsController } from './actions.controller';
import { ConfirmationService } from './confirmation.service';

@Module({
  imports: [JwtModule.register({}), GraphToolsModule, PrismaModule],
  controllers: [ActionsController],
  providers: [ConfirmationService],
  exports: [ConfirmationService],
})
export class ConfirmationModule {}
