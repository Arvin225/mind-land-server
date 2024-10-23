import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SlipBoxService } from './slip-box.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Card } from './entities/card.entity';
import { Tag } from './entities/tag.entity';
import { CreateCardDto } from './dto/createCardDto';
import { create } from 'domain';

@ApiTags('SlipBox')
@Controller('slip-box')
export class SlipBoxController {

    constructor(private readonly slipBoxService: SlipBoxService) { }

    @ApiOperation({ summary: '获取所有卡片' })
    @Get('/cards')
    public getAllCards(@Param('del') del: boolean): Promise<Card[]> {
        return this.slipBoxService.getAllCards(del);
    }

    @ApiOperation({ summary: '获取单个卡片' })
    @Get('/cards/:id')
    public getCard(@Param('id') id: number): Promise<Card> {
        return this.slipBoxService.getCard(id);
    }

    @ApiOperation({ summary: '获取所有标签' })
    @Get('/tags')
    public getAllTags(): Promise<Tag[]> {
        return this.slipBoxService.getAllTags();
    }

    @ApiOperation({ summary: '获取单个标签' })
    @Get('/tags/:id')
    public getTag(@Param('id') id: number): Promise<Tag> {
        return this.slipBoxService.getTag(id)
    }

    @ApiOperation({ summary: '新建卡片' })
    @ApiParam({ name: 'createCardDto', description: 'text文本 + html文本' })
    @Post('/cards')
    public createCard(@Body() createCardDto: CreateCardDto): Promise<{ card: Card, tags: Tag[] }> {
        return this.slipBoxService.createCard(createCardDto);
    }

    @ApiOperation({ summary: '删除卡片' })
    @Delete('/cards/:id')
    public deleteCard(@Param('id') id: number) {

    }
}
