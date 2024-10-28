import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ToDoListNames } from './entities/to-do-list-names.entity';
import { Repository } from 'typeorm';
import { ToDoList } from './entities/to-do-list.entity';

@Injectable()
export class ToDoService {
    constructor(
        @InjectRepository(ToDoListNames) private readonly toDoListNamesRepository: Repository<ToDoListNames>,
        @InjectRepository(ToDoList) private readonly toDoListRepository: Repository<ToDoList>
    ) { }
}
