import { ApiProperty } from "@nestjs/swagger"

export class GetItemsDto {
    @ApiProperty({ description: '列表id', type: Number, required: false })
    listId?: number

    @ApiProperty({ description: '是否星标', type: Boolean, required: false })
    star?: boolean

    @ApiProperty({ description: '是否完成', type: Boolean, required: false })
    done?: boolean

    @ApiProperty({ description: '是否删除', type: Boolean, required: false })
    del?: boolean
}