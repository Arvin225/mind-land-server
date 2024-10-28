import { ApiProperty } from "@nestjs/swagger";

export class PostListDto {
    @ApiProperty({ description: '列表名称', type: String })
    name: string
}