import { ApiProperty } from "@nestjs/swagger"
import { Transform } from "class-transformer"

export class GetItemsDto {
    @ApiProperty({ description: '列表id', type: Number, required: false })
    listId?: number

    @ApiProperty({ description: '是否星标', type: Boolean, required: false })
    @Transform(({ value }) => value === 'true')
    star?: boolean

    @ApiProperty({ description: '是否完成', type: Boolean, required: false })
    @Transform(({ value }) => value === 'true')
    done?: boolean

    @ApiProperty({ description: '是否删除', type: Boolean, required: false })
    @Transform(({ value }) => value === 'true')
    del?: boolean
}