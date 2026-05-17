import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { GraphToolsService } from './graph-tools.service';

@Module({
  imports: [GraphModule],
  providers: [GraphToolsService],
  exports: [GraphToolsService],
})
export class GraphToolsModule {}
