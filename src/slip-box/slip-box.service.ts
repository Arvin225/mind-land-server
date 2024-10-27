import { HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Card } from './entities/card.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { CreateCardDto } from './dto/create-card.dto';
import { compile } from 'html-to-text';
import * as _ from 'lodash';
import getCurrentDateTime from 'src/utils/get-current-date-time.util';
import { DeleteTagDto } from './dto/delete-tag.dto';

@Injectable()
export class SlipBoxService {
    constructor(
        @InjectRepository(Card) private cardRepository: Repository<Card>,
        @InjectRepository(Tag) private tagRepository: Repository<Tag>,
        private dataSource: DataSource
    ) { }

    /* 获取所有卡片 */
    async getAllCards(del: boolean): Promise<Card[]> {
        return await this.cardRepository.findBy({ del })
    }

    /* 通过tagId获取卡片 */
    async getCardsByTagId(tagId: number): Promise<Card[]> {

        // 获取该标签及其后代标签下的所有卡片id并去重
        const allCardIds = _.uniq(await getCardIdsByTagAndOffspring(tagId, this.tagRepository))

        // 获取卡片
        const allCards = await Promise.all(allCardIds.map(async id => {
            return await this.cardRepository.findOneBy({ id })
        }))

        return allCards

        /* 获取标签及其后代标签的卡片id，返回卡片id数组 */
        async function getCardIdsByTagAndOffspring(tagId: number, tagRepository: Repository<Tag>) {
            const tag = await tagRepository.findOneBy({ id: tagId })
            if (!tag) {
                console.warn('找不到该标签：', tagId)
                return []
            }

            // 初始化数组
            const tagAndOffspringCards = [...tag.cards]

            // 获取children
            const children = tag.children
            // 递归终止条件：children为空
            for (let i = 0; i < children.length; i++) {
                const cid = children[i];
                // 业务逻辑：收集后代标签的card
                tagAndOffspringCards.push(... await getCardIdsByTagAndOffspring(cid, tagRepository)) // 递归
            }

            return tagAndOffspringCards
        }

    }

    /* 获取一个卡片 */
    async getCard(id: number): Promise<Card> {
        return await this.cardRepository.findOneBy({ id })
    }

    /* 获取所有标签 */
    async getAllTags(): Promise<Tag[]> {
        return this.tagRepository.find()
    }

    /* 获取一个标签 */
    async getTag(id: number): Promise<Tag> {
        return this.tagRepository.findOneBy({ id })
    }

    /* 新建卡片 */
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

        // 过滤去重出标签
        const tagNames = _.uniq(probTagNames.filter(item => _.startsWith(item, '#') && item !== '#'))

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect() // 连接
        await queryRunner.startTransaction() // 开启事务
        const entityManager = queryRunner.manager
        try {
            // 1.将标签保存到tags表（不设置卡片id） //todo 这里得到的leafTags的tag是没有更新parent、children、cards和cardCount的
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
            console.error('createCard error', error);
            throw new HttpException('创建卡片失败', 400)
        } finally {
            await queryRunner.release() // 释放连接
        }

        /* 函数：保存标签到数据库 */
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
                // 标记是否继续收集标签
                let isContinueCollectTag = false

                for (let i = splitNames.length; i > 0; i--) {
                    // 取前i个分割的name以“/”构成祖先标签（或当前标签）的tagName
                    const tagName = splitNames.slice(0, i).join('/')

                    // 1.1 判断当前标签及其祖先标签是否存在
                    // 数据库查询该标签 
                    const tag: Tag = await entityManager.findOneBy(Tag, { tagName })

                    // 继续收集标签标记为真则不向下执行更新操作而继续向前遍历查询收集祖先标签
                    if (isContinueCollectTag) {
                        allTags.push(tag)
                        continue
                    }

                    // 1.1.1 存在则将cid添加到children（如果为叶子标签则cid为空）
                    if (tag) {
                        // 收集当前标签或其祖先标签
                        allTags.push(tag)
                        // 存在的是叶子标签则收集到cardTags和leafTags
                        if (!cid) {
                            cardTags.push(tag.id)
                            leafTags.push(tag)

                            // 标记继续收集标签
                            isContinueCollectTag = true

                            // 不再向下执行
                            continue

                        }

                        // 不是叶子标签时添加子标签的id到children属性中
                        tag.children.push(cid)
                        // 将当前标签的 id 设置到子标签的 parent 属性中
                        await entityManager.update(Tag, cid, { parent: tag.id })
                        // 将修改保存到数据库
                        await entityManager.update(Tag, tag.id, tag)

                        // 不再向前遍历
                        // break

                        // 标记继续收集标签
                        isContinueCollectTag = true

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

        /* 函数：保存 card  */
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

        /* 函数：将新增的 card 的 id 添加到叶子标签中 */
        async function addCardIdIntoTag(leafTags: Tag[], cardId: number, entityManager: EntityManager) {
            leafTags.forEach(async tag => {
                await entityManager.update(Tag, tag.id, { cards: [...tag.cards, cardId] })
            })
        }
    }

    /* 永久删除卡片 */
    async deleteCard({ id, tagIds }: { id: number, tagIds: number[] }) {

    }

    /* 删除卡片 */
    async removeCard({ id, tagIds }: { id: number, tagIds: number[] }): Promise<{ deletedTagIds: number[] }> {

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        const entityManager = queryRunner.manager
        try {

            // 1.将del置为true、设置删除时间
            await entityManager.update(Card, id, { builtOrDelTime: `删除于 ${getCurrentDateTime()}`, del: true })

            const deletedTagIds: number[] = []

            // 2.修改卡片计数
            // 定义记录计数修改过的标签的id数组，用于防止重复修改
            const decreasedTagIds: number[] = []
            for (let i = 0; i < tagIds.length; i++) {
                const tid = tagIds[i];
                // 向前遍历卡片的标签的所有父级，将计数-1
                await this.decreaseCardCount(entityManager, { id: tid }, decreasedTagIds, deletedTagIds,)

                // 3.若卡片标签没被删除则将卡片从其标签中删去
                if (!deletedTagIds.includes(tid)) {
                    const tag = await entityManager.findOneBy(Tag, { id: tid })
                    tag && await entityManager.update(Tag, tag.id, { cards: _.without(tag.cards, id) })
                }
            }

            await queryRunner.commitTransaction()

            return { deletedTagIds }

        } catch (error) {
            await queryRunner.rollbackTransaction()
            console.error('removeCard error', error);
            throw new HttpException('删除卡片失败', 400)
        } finally {
            await queryRunner.release()
        }
    }

    /* 函数：卡片计数减少 */
    async decreaseCardCount(entityManager: EntityManager, { id, count = 1, stopTag }: { id: number, count?: number, stopTag?: Tag }, decreasedTagIds?: number[], deletedTagIds?: number[]) {

        let cid: number | null
        // const deletedTagIds: number[] = []

        await decrease(id, count, stopTag)

        // 卡片计数-1的函数 
        async function decrease(id: number, count: number, stopTag?: Tag) {
            // 递归终止条件：id为空或减过
            if (!id || (decreasedTagIds && decreasedTagIds.includes(id))) return

            const tag = await entityManager.findOneBy(Tag, { id })
            const pid = tag.parent

            // 业务逻辑
            if (tag.cardCount === count) {
                // 卡片数量最后为0则删除当前标签
                await entityManager.delete(Tag, id)
                // 保存id
                cid = id
                // 收集删除的tag的id
                deletedTagIds && deletedTagIds.push(id)

                // 如果父标签是停止标签则将当前标签从其children属性中删除并结束递归
                if (stopTag && (pid === stopTag.id)) {
                    await entityManager.update(Tag, pid, { children: _.without(stopTag.children, id) })
                    return
                }

            } else {
                // 走到这表示上一级标签是最后一个卡片数量为1的标签（或者卡片数量不止1），则本标签将cid从children属性中删除
                let children: number[]
                if (cid) {
                    children = _.without(tag.children, cid)
                    //cid置为空
                    cid = null
                }
                // 将计数-1
                await entityManager.update(Tag, tag.id, { cardCount: tag.cardCount - count, children })
                // 收集计数减少过的tag
                decreasedTagIds && decreasedTagIds.push(tag.id)
            }

            // 递归
            await decrease(pid, count, stopTag)
        }

        // return deletedTagIds
    }

    /* 仅移除标签 */
    async deleteTag({ id, tagName }: DeleteTagDto) {

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        const entityManager = queryRunner.manager
        try {
            // 递归children
            await this.recursiveTagChildren(id, async (tag) => {
                const cards = tag.cards

                // 1.从当前标签的所有卡片中移除当前标签，内容上也移除 //todo 用正则处理文本
                for (let i = 0; i < cards.length; i++) {
                    const card = await entityManager.findOneBy(Card, { id: cards[i] })
                    const regex = new RegExp(`\\b#${tagName}\\b`, 'g')
                    await entityManager.update(Card, card.id, { content: card.content.replaceAll(regex, ''), tags: _.without(card.tags, tag.id) })
                }

                // 删除当前标签
                await entityManager.delete(Tag, tag.id)

                // 如果当前标签是递归回溯的根标签则：
                if (tag.id === id) {
                    const pid = tag.parent
                    if (pid) {
                        // 得到父标签
                        const parent = await entityManager.findOneBy(Tag, { id: pid })
                        // 将当前标签从父标签children属性中删除
                        await entityManager.update(Tag, pid, { children: _.without(parent.children, tag.id) })

                        // 递归修正父级标签的卡片计数
                        let cid: number | null
                        await this.recursiveTagParent(pid, async (tag) => {
                            // 获取从父标签开始的当前的所有卡片
                            const cardsFromParent = await this.getCardsByTagId(tag.id)
                            // 统计数量
                            const nowCardCount = cardsFromParent.length
                            if (nowCardCount) {
                                let children
                                if (cid) {
                                    children = _.without(tag.children, cid)
                                    cid = null
                                }
                                // 修正卡片计数
                                await entityManager.update(Tag, tag.id, { cardCount: nowCardCount, children })
                            } else {
                                await entityManager.delete(Tag, tag.id)
                                cid = tag.id
                            }
                        })


                        /* // 得到减少的数量
                        const removedCardCount = parent.cardCount - nowCardCount
    
                        let cid
                        //从父标签开始向前遍历修改卡片计数
                        await recursiveTagParent(pid, async (tag) => {
                            // 卡片计数减为0则删除当前标签
                            if (tag.cardCount === removedCardCount) {
                                await deleteTagAPI(tag.id)
                                cid = tag.id // 保存id
                            } else {
                                let children
                                if (cid) {
                                    children = _.without(tag.children, cid)
                                    cid = '' // 置为空
                                }
                                await patchTagAPI({ id: tag.id, children, cardCount: (tag.cardCount - removedCardCount) })
                            }
                        }) */

                    }
                }

            })

            await queryRunner.commitTransaction()

        } catch (error) {
            await queryRunner.rollbackTransaction()
            console.error('deleteTag error', error);
            throw new HttpException('仅移除标签失败', 400)
        } finally {
            await queryRunner.release()
        }
    }

    /* 删除标签及卡片 */
    async deleteTagOverCards({ id, tagName }: DeleteTagDto) {
        // 定义卡片剩余标签数组
        const cardsLeftoverTags: { id: number, tags: number[] }[] = []
        // 定义可直接减少的卡片数量
        let directlyDecreasedCardCount = 0

        const queryRunner = this.dataSource.createQueryRunner()
        await queryRunner.connect()
        await queryRunner.startTransaction()
        const entityManager = queryRunner.manager
        try {
            // 递归children
            await this.recursiveTagChildren(id, async (tag) => {
                const cards = tag.cards

                // 1.将当前标签下的所有卡片删除，设置删除时间
                for (let i = 0; i < cards.length; i++) {
                    const card = await entityManager.findOneBy(Card, { id: cards[i] })

                    // 查询当前卡片的剩余标签
                    const index = cardsLeftoverTags.findIndex(clt => clt.id === card.id)
                    // 查询到则将当前标签从其当前卡片剩于标签中删除后更新到卡片剩余标签数组中
                    if (index > 0) {
                        const leftoverTags = _.without(cardsLeftoverTags[index].tags, tag.id)
                        _.pullAt(cardsLeftoverTags, index)
                        // 剩余标签为空则不再记录
                        leftoverTags.length ? cardsLeftoverTags.push({ id: card.id, tags: leftoverTags }) : directlyDecreasedCardCount++
                    } else {
                        // 没查询到则追加到卡片剩余标签数组中
                        cardsLeftoverTags.push({ id: card.id, tags: _.without(card.tags, tag.id) })
                    }

                    // 删除当前卡片
                    !card.del && await entityManager.update(Card, card.id, { del: true, builtOrDelTime: `删除于 ${getCurrentDateTime()}` })
                }
                // 删除当前标签
                await entityManager.delete(Tag, tag.id)

                // 如果当前标签是递归回溯的根标签则将其从其父标签中删除
                if (tag.id === id) {
                    const pid = tag.parent
                    if (pid) {
                        // 得到父标签
                        const parent = await entityManager.findOneBy(Tag, { id: pid })
                        // 将当前标签从父标签children属性中删除
                        await entityManager.update(Tag, pid, { children: _.without(parent.children, tag.id) })

                        for (let i = 0; i < cardsLeftoverTags.length; i++) {
                            const cardLeftoverTags = cardsLeftoverTags[i];
                            const cardId = cardLeftoverTags.id
                            const tags = cardLeftoverTags.tags
                            // let noParentAndSiblingTag = true
                            for (let i = 0; i < tags.length; i++) {
                                const tagId = tags[i];
                                const tag = await entityManager.findOneBy(Tag, { id: tagId })

                                // 将当前卡片从此标签的cards中移除
                                await entityManager.update(Tag, tagId, { cards: _.without(tag.cards, cardId) })

                                const name = tag.tagName
                                const parentName = parent.tagName
                                // 如果是兄弟或侄子标签，将其卡片计数-1，减到0则将其删除并在父标签的children中删除该标签
                                if (name.startsWith(parentName)) {
                                    await this.decreaseCardCount(entityManager, { id: tagId, count: 1, stopTag: parent }) //! 如果兄弟标签和其子级标签同时持有卡片时又会出现同样的被删找不到的问题

                                    // 如果是父级标签，则不做计数操作
                                } else if (!tagName.startsWith(name)) {
                                    // 卡片计数-1 
                                    await this.decreaseCardCount(entityManager, { id: tagId, count: 1, stopTag: parent }) //! 非父级或兄弟标签同样存在找不到的问题
                                }


                                /* let cid
                                //从父标签开始向前遍历修改卡片计数
                                await recursiveTagParent(tagId, (id) => decreasedTagIds.includes(id), async (tag) => {
                                    // 卡片计数减为0则删除当前标签
                                    if (tag.cardCount === 1) {
                                        await deleteTagAPI(tag.id)
                                        cid = tag.id // 保存id
                                        } else {
                                            let children
                                        if (cid) {
                                            children = _.without(tag.children, cid)
                                            cid = '' // 置为空
                                            }
                                            await patchTagAPI({ id: tag.id, children, cardCount: (tag.cardCount - 1) })
                                            decreasedTagIds.push(tag.id)
                                            }
                                            }) */
                            }
                            directlyDecreasedCardCount++
                            // noParentAndSiblingTag && directlyDecreasedCardCount++
                        }

                        // 从父标签开始向前遍历修正卡片计数 
                        await this.decreaseCardCount(entityManager, { id: pid, count: directlyDecreasedCardCount })
                    }
                }

            })
        } catch (error) {
            await queryRunner.rollbackTransaction()
            console.error('deleteTagOverCards error', error);
            throw new HttpException('删除标签及卡片失败', 400)
        } finally {
            await queryRunner.release()
        }
    }

    /* 函数：递归标签的children */
    async recursiveTagChildren(tagId: number, task: (tag: Tag) => void) {
        // 递归终止条件
        if (!tagId) return

        const tag = await this.tagRepository.findOneBy({ id: tagId })
        const children = tag.children

        for (let i = 0; i < children.length; i++) {
            const cid = children[i];
            // 递归
            await this.recursiveTagChildren(cid, task)
        }

        // 业务
        await task(tag)
    }

    /* 函数：递归标签的parent */
    async recursiveTagParent(tagId: number, task: (tag: Tag) => void) {
        // 递归终止条件
        if (!tagId) return

        const tag = await this.tagRepository.findOneBy({ id: tagId })
        const pid = tag.parent

        // 业务
        await task(tag)

        // 递归
        await this.recursiveTagParent(pid, task)

    }

}
