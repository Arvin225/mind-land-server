import { ApiProperty } from "@nestjs/swagger"
import { Card } from "../entities/card.entity"
import { Tag } from "../entities/tag.entity"

export class CreateCardResponse {
    @ApiProperty({ description: '新建的卡片', type: Card })
    card: Card

    @ApiProperty({ description: '包含的标签们', type: Tag, isArray: true })
    tags: Tag[]
}