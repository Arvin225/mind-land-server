import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Tag {
    @PrimaryGeneratedColumn()
    id?: number;

    @Column({ unique: true })
    tagName: string;

    @Column()
    parent: number;

    @Column("simple-array")
    children: number[];

    @Column()
    cardCount: number;

    @Column("simple-array")
    cards: number[];
}