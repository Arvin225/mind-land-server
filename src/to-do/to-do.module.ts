import { Module } from '@nestjs/common';
import { ToDoService } from './to-do.service';
import { ToDoController } from './to-do.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToDoItem } from './entities/to-do-item.entity';
import { ToDoList } from './entities/to-do-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ToDoList, ToDoItem])],
  providers: [ToDoService],
  controllers: [ToDoController]
})
export class ToDoModule { }
