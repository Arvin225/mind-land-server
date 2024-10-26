import { ApiProperty } from '@nestjs/swagger'

export class DeleteTagDto {
    @ApiProperty({ description: '标签id' })
    id: number
    @ApiProperty({ description: '标签名称' })
    tagName: string
    @ApiProperty({ description: '是否删除卡片', required: false })
    overCards?: boolean
}