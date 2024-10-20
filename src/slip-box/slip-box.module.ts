import { Module } from '@nestjs/common';
import { SlipBoxService } from './slip-box.service';
import { SlipBoxController } from './slip-box.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { Tag } from './entities/tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Card, Tag])],
  providers: [SlipBoxService],
  controllers: [SlipBoxController]
})
export class SlipBoxModule { }
