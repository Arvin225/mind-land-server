import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateCardDto } from './dto/createCardDto';
import { compile } from 'html-to-text';
import * as _ from 'lodash';
import getCurrentDateTime from 'src/utils/getCurrentDateTime';

@Injectable()
export class SlipBoxService {
    constructor(
        @InjectRepository(Card) private cardRepository: Repository<Card>,
        @InjectRepository(Tag) private tagRepository: Repository<Tag>,
        private dataSource: DataSource
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

    async createCard(createCardDto: CreateCardDto): Promise<{ card: Card, tags: Tag[] }> {
        const { contentWithHtml, contentWithText } = createCardDto
        // 按<p>分离
        const htmlContentArraySplitByP = contentWithHtml.split('<p>')
        // 再按<li>分离
        const htmlContentArraySplitByPAndLi: string[] = []
        htmlContentArraySplitByP.forEach(s => {
            htmlContentArraySplitByPAndLi.push(...s.split('<li>'))
        })
        // 清洗成text
        const compiledConvert = compile({
            selectors: [
                // 配置跳过p和li标签的换行符输出
                { selector: 'p', format: 'skip' },
                { selector: 'li', format: 'skip' },
            ]
        })
        const textContentArraySplitByPAndLi = htmlContentArraySplitByPAndLi.map(compiledConvert)

        // 按空格分离
        const probTagNames: string[] = []
        textContentArraySplitByPAndLi.forEach(s => {
            probTagNames.push(...s.split(' '))
        })
        // 按空格分离
        // const probTagNames = contentWithText.split(' ') 

        // 过滤去重出标签
        const tagNames = _.uniq(probTagNames.filter(item => _.startsWith(item, '#') && item !== '#'))



        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect() // 连接
        await queryRunner.startTransaction() // 开启事务
        const entityManager = queryRunner.manager
        try {
            // 1.将标签保存到tags表（不设置卡片id）
            const { cardTags, leafTags } = await saveTag(tagNames, entityManager)

            // 2.将id与html文本一起存到cards表
            const card = await saveCard(contentWithHtml, contentWithText, cardTags, entityManager)

            // 3.将当前卡片的id保存到其所有标签中
            await addCardIdIntoTag(leafTags, card.id, entityManager)

            await queryRunner.commitTransaction() // 提交事务

            const tags = leafTags.map(tag => ({ ...tag, cardCount: tag.cardCount + 1, cards: [...tag.cards, card.id] }))
            return { card, tags }
        } catch (error) {
            await queryRunner.rollbackTransaction() // 事务回滚
            throw new HttpException(error, 500)
        } finally {
            await queryRunner.release() // 释放连接
        }



        // 保存标签到数据库的函数
        async function saveTag(tagNames: string[], entityManager: EntityManager): Promise<{ cardTags: number[], leafTags: Tag[] }> {
            // 定义card的标签数组，标签存库结束后该数组也收集完毕
            const cardTags: number[] = []
            // 定义叶子标签数组，标签存库结束后该数组也收集完毕
            const leafTags: Tag[] = []
            // 定义所有标签数组，标签存库结束后该数组也收集完毕
            const allTags: Tag[] = []

            // 1.遍历标签，将标签存到tags表
            for (let i = 0; i < tagNames.length; i++) {
                // 去除“#”
                const name = tagNames[i].slice(1)
                // 按“/”分割
                const splitNames = name.split('/')

                let cid: number
                // try {
                for (let i = splitNames.length; i > 0; i--) {
                    // 取前i个分割的name以“/”构成祖先标签（或当前标签）的tagName
                    const tagName = splitNames.slice(0, i).join('/')

                    // 1.1 判断当前标签及其祖先标签是否存在
                    // 数据库查询该标签 //todo 或许数据库拉取所有tag（或store里保存的所有tag）再比对会更规范些？
                    const tag: Tag = await entityManager.findOneBy(Tag, { tagName })

                    // 1.1.1 存在则将cid添加到children（如果为叶子标签则cid为空）
                    if (tag) {
                        // 收集当前标签或其祖先标签
                        allTags.push(tag)
                        // 存在的是叶子标签则收集到cardTags和leafTags
                        if (!cid) {
                            cardTags.push(tag.id)
                            leafTags.push(tag)
                            // 不再向前遍历
                            break
                        }

                        // 不是叶子标签时添加子标签的id到children属性中
                        tag.children.push(cid)
                        // 将当前标签的 id 设置到子标签的 parent 属性中
                        await entityManager.update(Tag, cid, { parent: tag.id })
                        // 将修改保存到数据库
                        await entityManager.update(Tag, tag.id, tag)

                        // 不再向前遍历
                        break

                        // 1.1.2 不存在则创建（将cardCount置为0，将子标签的id添加到children，将当前标签的id设置到子标签的parent中）
                    } else {
                        const newTag: Tag = { tagName: tagName, parent: 0, children: [], cardCount: 0, cards: [] }
                        // 非叶子标签则将子标签的id添加到children属性中
                        cid && (newTag.children.push(cid))
                        // 新增到数据库
                        const tag = await entityManager.save(Tag, newTag)

                        // 收集当前标签或其祖先标签
                        allTags.push(tag)

                        // const tag = await res.data
                        const id = tag.id

                        // 将当前标签的 id 设置到子标签的 parent 属性中
                        cid && await entityManager.update(Tag, cid, { parent: id })

                        // 如果是叶子标签则收集到cardTags和leafTags
                        if (!cid) {
                            cardTags.push(id)
                            leafTags.push(tag)
                        }

                        // 1.1.2.1 将当前标签的id存放到cid 
                        cid = id
                        /* // 再查回来 
                        const res = await getTagByTagNameAPI(tagName) */
                    }
                }
                /* } catch (error) {
                    console.error('For loop splitNames error', error)
                } */

                // 收集去除“#”的叶子标签
                // uniqAllTagNames.push(name) // 单独收集叶子标签是为了提高性能，已经去重了便不必再去重

                // const splitNames = name.split('/') // 分离
                /* for (let j = splitNames.length - 1; j > 0; j--) {
                    // 组合父级标签名并收集
                    preTagNames.push(splitNames.slice(0, j).join('/')) 
                } */
            }
            // 2.1 将收集的所有标签去重
            const uniqAllTags = _.uniqBy(allTags, 'tagName')
            // 2.2 对每个标签及其祖先标签卡片计数+1
            uniqAllTags.forEach(async tag => {
                await entityManager.increment(Tag, { id: tag.id }, 'cardCount', 1)
            })

            // 2.1 提交cardCount+1
            // increaseCardCount(uniqAllTags)

            return { cardTags, leafTags }
        }

        // 令标签的 cardCount + 1 的函数
        // function increaseCardCount(uniqAllTags: Tag[]) { 

        //     /* uniqAllTags.forEach(async tag => {
        //         await this.tagRepository.update(tag.id, { cardCount: tag.cardCount + 1 })
        //     }) */

        //     /* const promiseList = [];
        //     uniqAllTagNames.forEach(name => {
        //         // 获取当前标签
        //         promiseList.push(this.tagRepository.findOneBy({ tagName: name })); //todo 或许可以saveTag里先收集tag再按id去重，或许直接遍历去重后的tags就好了，这里getTag就不需要了

        //     })
        //     Promise.all(promiseList).then(async (resList) => {
        //         const promiseList = [];
        //         for (let i = 0; i < resList.length; i++) {
        //             const id = await resList[i].data[0].id;
        //             const cardCount = await resList[i].data[0].cardCount;
        //             // 提交cardCount+1
        //             promiseList.push(await this.tagRepository.update(id, { cardCount: cardCount + 1 }));
        //         } */
        //     /* resList.forEach(async res => {
        //         const id = await res.data[0].id
        //         const cardCount = await res.data[0].cardCount
        //         // 提交cardCount+1
        //         promiseList.push(await patchTagAPI({ id: id, cardCount: cardCount + 1 }))
        //     }) */
        //     /* return Promise.all(promiseList);
        // }).catch(error => {
        //     console.error('Error: ', error);
        // }); */
        // }

        // 保存 card 的函数
        async function saveCard(contentWithHtml: string, contentWithText: string, cardTags: number[], entityManager: EntityManager): Promise<Card> {
            const currentDateTime = getCurrentDateTime(); // 格式化当前时间
            return await entityManager.save(Card,
                {
                    content: contentWithHtml,
                    builtOrDelTime: `创建于 ${currentDateTime}`,
                    statistics: {
                        builtTime: currentDateTime,
                        updateTime: currentDateTime,
                        words: contentWithText.length
                    },
                    tags: cardTags,
                    del: false
                }
            )
            /* try {
                await postCardAPI(
                    {
                        content: contentWithHtml,
                        builtTime: currentDateTime,
                        statistics: {
                            builtTime: currentDateTime,
                            updateTime: currentDateTime,
                            words: contentWithText.length
                        },
                        tags: cardTags
                    }
                );
                // 4.更新store (cards、tags) 
                // 更新store-tags
                dispatch(fetchGetTags());
                // todo 判断添加的card的tag是否是在当前路径下，是则拉取cards
                dispatch(fetchGetCards());
                // 清空输入框
                editor.clear();
            } catch (error) {
                toast.error('提交失败，请稍后重试');
                console.error('Error: ', error);
            } */
        }

        // 将新增的 card 的 id 添加到叶子标签中的函数
        async function addCardIdIntoTag(leafTags: Tag[], cardId: number, entityManager: EntityManager) {
            leafTags.forEach(async tag => {
                await entityManager.update(Tag, tag.id, { cards: [...tag.cards, cardId] })
            })
        }
    }
}
