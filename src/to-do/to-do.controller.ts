import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ToDoService } from './to-do.service';
import { ToDoList } from './entities/to-do-list.entity';
import { PatchListDto } from './dto/patch-list.dto';
import { PatchItemDto } from './dto/patch-item.dto';
import { DeleteItemDto } from './dto/delete-item.dto';
import { PostItemDto } from './dto/post-item.dto';
import { GetItemsDto } from './dto/get-items.dto';
import { PostListDto } from './dto/post-list.dto';
import { ApiBody, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ToDoItem } from './entities/to-do-item.entity';

@ApiTags('ToDo')
@Controller('to-do')
export class ToDoController {
    constructor(private readonly toDoService: ToDoService) { }

    @ApiOperation({ summary: '新建列表' })
    @ApiBody({ type: PostListDto })
    @Post('/lists')
    public postList(@Body() postListDto: PostListDto) {
        return this.toDoService.createList(postListDto)
    }

    @ApiOperation({ summary: '获取所有列表' })
    @ApiResponse({ type: ToDoList, isArray: true })
    @Get('/lists')
    public getLists(): Promise<ToDoList[]> {
        return this.toDoService.getAllLists()
    }

    @ApiOperation({ summary: '修改列表' })
    @ApiBody({ type: PatchListDto })
    @Patch('/lists')
    public patchList(@Body() patchListDto: PatchListDto) {
        return this.toDoService.modifyListName(patchListDto)
    }

    @ApiOperation({ summary: '删除列表' })
    @Delete('/lists/:id')
    public deleteList(@Param('id') id: number) {
        return this.toDoService.deleteList(id)
    }


    @ApiOperation({ summary: '新增待办项' })
    @ApiBody({ type: PostItemDto })
    @Post('/items')
    public postItem(@Body() postItemDto: PostItemDto) {
        return this.toDoService.createItem(postItemDto)
    }

    @ApiOperation({ summary: '获取列表下的待办项' })
    @ApiResponse({ type: ToDoItem, isArray: true })
    @Get('/items')
    public getItems(@Body() getItemsDto: GetItemsDto): Promise<ToDoItem[]> {
        return this.toDoService.getItems(getItemsDto)
    }

    @ApiOperation({ summary: '修改待办项' })
    @ApiBody({ type: PatchItemDto })
    @Patch('/items')
    public patchItem(@Body() patchItemDto: PatchItemDto) {
        return this.toDoService.patchItem(patchItemDto)
    }

    @ApiOperation({ summary: '删除待办项' })
    @ApiBody({ type: DeleteItemDto })
    @Delete('/items')
    public deleteItem(@Body() { id, permanent = false }: DeleteItemDto) {
        if (permanent) {
            return this.toDoService.deleteItem(id)
        } else {
            return this.toDoService.removeItem(id)
        }
    }
}
