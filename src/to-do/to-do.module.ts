import { Module } from '@nestjs/common';
import { ToDoService } from './to-do.service';
import { ToDoController } from './to-do.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ToDoListNames } from './entities/to-do-list-names.entity';
import { ToDoList } from './entities/to-do-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ToDoListNames, ToDoList])],
  providers: [ToDoService],
  controllers: [ToDoController]
})
export class ToDoModule { }
