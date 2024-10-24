import { ApiProperty } from "@nestjs/swagger";

export class DeleteCardResponse {
    @ApiProperty({ description: '被删除的标签们的id', type: Number, isArray: true })
    deletedTagIds: number[]
}