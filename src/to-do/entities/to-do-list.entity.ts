import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ToDoList {
    @ApiProperty({ description: '列表名id', type: Number })
    @PrimaryGeneratedColumn()
    id: number

    @ApiProperty({ description: '列表名称', type: String })
    @Column()
    name: string

}