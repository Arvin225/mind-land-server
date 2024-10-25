import { ApiProperty } from "@nestjs/swagger"
import { IsArray, IsBoolean, IsNotEmpty, IsNumber } from "class-validator"

export class DeleteCardDto {
    @ApiProperty({ description: '卡片id', type: Number })
    @IsNumber()
    @IsNotEmpty()
    readonly id: number

    @ApiProperty({ description: '属于该卡片的标签们的id', type: Number, isArray: true })
    @IsNumber({}, { each: true })
    @IsNotEmpty()
    readonly tagIds: number[]

    @ApiProperty({ description: '提交永久删除', type: Boolean, required: false })
    @IsBoolean()
    readonly permanent?: boolean
}