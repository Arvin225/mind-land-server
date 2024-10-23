import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateCardDto {
    @ApiProperty({ description: '文本内容' })
    @IsString()
    @IsNotEmpty({ message: '文本内容不能为空' })
    readonly contentWithText: string;

    @ApiProperty({ description: 'html内容' })
    @IsString()
    @IsNotEmpty({ message: 'html内容不能为空' })
    readonly contentWithHtml: string;
}   