import { Controller } from '@nestjs/common';
import { ToDoService } from './to-do.service';

@Controller('to-do')
export class ToDoController {
    constructor(private readonly toDoService: ToDoService) { }
}
