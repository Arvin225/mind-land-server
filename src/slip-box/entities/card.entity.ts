import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Card {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    content: string;

    @Column()
    builtOrDelTime: string;

    @Column("simple-json")
    statistics: {
        builtTime: string;
        updateTime: string;
        words: number;
    };

    // @ManyToMany(type => Tag, tag => tag.cards)
    @Column("simple-array")
    tags: string[];

    @Column()
    del: boolean;
}