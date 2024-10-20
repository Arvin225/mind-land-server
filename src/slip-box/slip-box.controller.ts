import { Controller, Get, Param } from '@nestjs/common';
import { SlipBoxService } from './slip-box.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Card } from './entities/card.entity';
import { Tag } from './entities/tag.entity';

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
}
