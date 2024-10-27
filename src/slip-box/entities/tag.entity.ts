import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Tag {
    @ApiProperty({ description: '标签id', type: Number })
    @PrimaryGeneratedColumn()
    id?: number;

    @ApiProperty({ description: '标签名', type: String })
    @Index({ unique: true })
    @Column()
    tagName: string;

    @ApiProperty({ description: '父标签的id', type: Number })
    @Column()
    parent: number;

    @ApiProperty({ description: '子标签们的id', type: Number, isArray: true })
    @Column("json")
    children: number[];

    @ApiProperty({ description: '卡片数量', type: Number })
    @Column()
    cardCount: number;

    @ApiProperty({ description: '卡片们的id', type: Number, isArray: true })
    @Column("json")
    cards: number[];
}