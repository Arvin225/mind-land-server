import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { SlipBoxService } from './slip-box.service';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Card } from './entities/card.entity';
import { Tag } from './entities/tag.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { DeleteCardDto } from './dto/delete-card.dto';
import { DeleteCardResponse } from './responses/delete-card.response';
import { CreateCardResponse } from './responses/create-card.response';

@ApiTags('SlipBox')
@Controller('slip-box')
export class SlipBoxController {

    constructor(private readonly slipBoxService: SlipBoxService) { }

    @ApiOperation({ summary: '获取所有/特定标签下的卡片' })
    @ApiQuery({ description: '传del获取所有卡片，传tagId获取此标签下的所有卡片' })
    @ApiResponse({ description: '卡片们获取成功', type: Card, isArray: true })
    @Get('/cards')
    public getCards(@Query() getBy: { del: boolean } | { tagId: number }): Promise<Card[]> {
        if ('del' in getBy) {
            return this.slipBoxService.getAllCards(getBy.del);
        } else if ('tagId' in getBy) {
            return this.slipBoxService.getCardsByTagId(getBy.tagId)
        }
    }

    @ApiOperation({ summary: '获取单个卡片' })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ description: '卡片获取成功', type: Card })
    @Get('/cards/:id')
    public getCard(@Param('id') id: number): Promise<Card> {
        return this.slipBoxService.getCard(id);
    }

    @ApiOperation({ summary: '获取所有标签' })
    @ApiResponse({ description: '标签们获取成功', type: Tag, isArray: true })
    @Get('/tags')
    public getAllTags(): Promise<Tag[]> {
        return this.slipBoxService.getAllTags();
    }

    @ApiOperation({ summary: '获取单个标签' })
    @ApiParam({ name: 'id', type: Number })
    @ApiResponse({ description: '标签获取成功', type: Tag })
    @Get('/tags/:id')
    public getTag(@Param('id') id: number): Promise<Tag> {
        return this.slipBoxService.getTag(id)
    }

    @ApiOperation({ summary: '新建卡片' })
    @ApiBody({ description: 'text文本 + html文本', type: CreateCardDto })
    @ApiResponse({ description: '卡片新建成功', type: CreateCardResponse })
    @Post('/cards')
    public createCard(@Body() createCardDto: CreateCardDto): Promise<CreateCardResponse> {
        return this.slipBoxService.createCard(createCardDto);
    }

    @ApiOperation({ summary: '删除卡片' })
    @ApiBody({ description: '卡片id及其标签们的id', type: DeleteCardDto })
    @ApiResponse({ description: '卡片删除成功', type: DeleteCardResponse })
    @Delete('/cards')
    public deleteCard(@Body() deleteCardDto: DeleteCardDto): Promise<DeleteCardResponse> | Promise<void> {
        if (deleteCardDto.permanent) {
            // 永久删除
            return this.slipBoxService.deleteCard(deleteCardDto)
        } else {
            return this.slipBoxService.removeCard(deleteCardDto)
        }
    }
}
