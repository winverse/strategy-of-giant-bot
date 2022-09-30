import { Module } from '@nestjs/common';
import { UtilsModule } from '@provider/utils';
import { MessagesService } from './messages.service';

@Module({
  imports: [UtilsModule],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
