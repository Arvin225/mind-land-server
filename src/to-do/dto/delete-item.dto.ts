import { ApiProperty } from "@nestjs/swagger";

export class DeleteItemDto {
    @ApiProperty({ description: '待办项id', type: Number })
    id: number

    @ApiProperty({ description: '是否永久删除', type: Boolean, required: false })
    permanent?: boolean
}