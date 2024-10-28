import { ApiProperty } from "@nestjs/swagger";

export class PatchListDto {
    @ApiProperty({ description: '列表id', type: Number })
    id: number

    @ApiProperty({ description: '列表名称', type: String })
    name: string
}