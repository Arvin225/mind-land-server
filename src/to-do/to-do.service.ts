import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ToDoList } from './entities/to-do-list.entity';
import { ToDoItem } from './entities/to-do-item.entity';
import { PatchListDto } from './dto/patch-list.dto';
import { PatchItemDto } from './dto/patch-item.dto';
import { PostItemDto } from './dto/post-item.dto';
import { GetItemsDto } from './dto/get-items.dto';
import { PostListDto } from './dto/post-list.dto';


@Injectable()
export class ToDoService {
    constructor(
        @InjectRepository(ToDoList) private readonly toDoListRepository: Repository<ToDoList>,
        @InjectRepository(ToDoItem) private readonly toDoItemRepository: Repository<ToDoItem>,
        private dataSource: DataSource
    ) { }

    /* 新建列表 */
    async createList(postListDto: PostListDto) {
        return this.toDoListRepository.save(postListDto)
    }

    /* 获取所有列表 */
    async getAllLists() {
        return this.toDoListRepository.find()
    }

    /* 修改列表名称 */
    async modifyListName({ id, name }: PatchListDto) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        const entityManager = queryRunner.manager
        try {
            // 有待办则更新所有待办的listName
            const toDoItems = await entityManager.findBy(ToDoItem, { listId: id, del: false })
            if (toDoItems && toDoItems.length) {
                await Promise.all(toDoItems.map(item => entityManager.update(ToDoItem, item.id, { listName: name })))
            }
            // 更新列表名
            await entityManager.update(ToDoList, id, { name })

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            console.error('modifyListName Error', error);
            throw new HttpException('修改列表名称失败', 400)
        } finally {
            await queryRunner.release()
        }

    }

    /* 删除列表 */
    async deleteList(id: number) {
        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        const entityManager = queryRunner.manager
        try {
            // 有待办则先删除所有待办
            const toDoItems = await entityManager.findBy(ToDoItem, { listId: id, del: false })
            if (toDoItems && toDoItems.length) {
                await Promise.all(toDoItems.map(item => entityManager.update(ToDoItem, item.id, { del: true, listId: 0, listName: '' })))
            }
            // 删除列表
            await entityManager.delete(ToDoList, id)

            await queryRunner.commitTransaction()
        } catch (error) {
            await queryRunner.rollbackTransaction()
            console.error('deleteList Error', error);
            throw new HttpException('删除列表失败', 400)
        } finally {
            await queryRunner.release()
        }
    }


    /* 新增待办项 */
    async createItem(postItemDto: PostItemDto) {
        return this.toDoItemRepository.save(postItemDto)
    }

    /* 获取列表下的待办项 */
    async getItems(getItemsDto: GetItemsDto) {
        return this.toDoItemRepository.findBy(getItemsDto)
    }

    /* 修改待办项 */
    async patchItem(patchItemDto: PatchItemDto) {
        return this.toDoItemRepository.update(patchItemDto.id, patchItemDto)
    }

    /* 非永久删除待办项 */
    async removeItem(id: number) {
        return this.toDoItemRepository.update(id, { del: true, listId: 0, listName: '' })
    }

    /* 永久删除待办项 */
    async deleteItem(id: number) {
        return this.toDoItemRepository.delete(id)
    }
}
