import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { getRedisConnectionOptions } from './redis-connection';

@Module({
  imports: [
    BullModule.forRoot({
      connection: getRedisConnectionOptions(),
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
