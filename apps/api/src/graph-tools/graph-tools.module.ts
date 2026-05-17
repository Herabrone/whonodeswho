import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { GraphToolExecutorService } from './graph-tool-executor.service';
import { GraphToolsService } from './graph-tools.service';

@Module({
  imports: [GraphModule],
  providers: [GraphToolsService, GraphToolExecutorService],
  exports: [GraphToolsService, GraphToolExecutorService],
})
export class GraphToolsModule {}
