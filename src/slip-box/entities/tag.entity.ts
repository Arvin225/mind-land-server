import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Tag {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    tagName: string;

    @Column()
    parent: string;

    @Column("simple-array")
    children: string[];

    @Column()
    cardCount: number;

    @Column("simple-array")
    cards: string[];
}