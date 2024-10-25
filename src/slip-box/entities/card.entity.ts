import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

class Statistics {
    @ApiProperty({ description: '创建时间', type: String })
    builtTime: string;
    @ApiProperty({ description: '更新时间', type: String })
    updateTime: string;
    @ApiProperty({ description: '字数', type: Number })
    words: number;
}

@Entity()
export class Card {
    @ApiProperty({ description: '卡片id', type: Number })
    @PrimaryGeneratedColumn()
    id: number;

    @ApiProperty({ description: '内容', type: String })
    @Column("text")
    content: string;

    @ApiProperty({ description: '创建或删除日期', type: String })
    @Column()
    builtOrDelTime: string;

    @ApiProperty({ description: '统计信息', type: Statistics })
    @Column("simple-json")
    statistics: Statistics;

    @ApiProperty({ description: '包含的标签们的id', type: Number, isArray: true })
    // @ManyToMany(type => Tag, tag => tag.cards)
    @Column("json")
    tags: number[];

    @ApiProperty({ description: '删除标记', type: Boolean })
    @Column()
    del: boolean;
}