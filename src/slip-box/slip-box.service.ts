import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';

@Injectable()
export class SlipBoxService {
    constructor(
        @InjectRepository(Card) private cardRepository: Repository<Card>,
        @InjectRepository(Tag) private tagRepository: Repository<Tag>
    ) { }

    async getAllCards(del: boolean): Promise<Card[]> {
        return await this.cardRepository.findBy({ del })
    }

    async getCard(id: number): Promise<Card> {
        return await this.cardRepository.findOneBy({ id })
    }

    async getAllTags(): Promise<Tag[]> {
        return this.tagRepository.find()
    }

    async getTag(id: number): Promise<Tag> {
        return this.tagRepository.findOneBy({ id })
    }
}
