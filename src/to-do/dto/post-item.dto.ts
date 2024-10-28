import { ApiProperty } from "@nestjs/swagger";
import { Column, PrimaryGeneratedColumn } from "typeorm";

export class PostItemDto {
    @ApiProperty({ description: '待办项id', type: Number })
    @PrimaryGeneratedColumn()
    id: number

    @ApiProperty({ description: '待办项内容', type: String })
    @Column()
    content: string

    @ApiProperty({ description: '是否完成', type: Boolean })
    @Column()
    done: boolean

    @ApiProperty({ description: '是否星标', type: Boolean })
    @Column()
    star: boolean

    @ApiProperty({ description: '是否删除', type: Boolean })
    @Column()
    del: boolean

    @ApiProperty({ description: '所属列表id', type: Number })
    @Column()
    listId: number

    @ApiProperty({ description: '所属列表名称', type: String })
    @Column()
    listName: string
}