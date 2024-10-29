import { ApiProperty } from "@nestjs/swagger";
import { Column, PrimaryGeneratedColumn } from "typeorm";

export class PatchItemDto {
    @ApiProperty({ description: '待办项id', type: Number })
    @PrimaryGeneratedColumn()
    id: number

    @ApiProperty({ description: '待办项内容', type: String, required: false })
    @Column()
    content?: string

    @ApiProperty({ description: '是否完成', type: Boolean, required: false })
    @Column()
    done?: boolean

    @ApiProperty({ description: '是否星标', type: Boolean, required: false })
    @Column()
    star?: boolean

    @ApiProperty({ description: '所属列表id', type: Number, required: false })
    @Column()
    listId?: number

    @ApiProperty({ description: '所属列表名称', type: String, required: false })
    @Column()
    listName?: string
}