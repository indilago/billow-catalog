import {attribute, hashKey, rangeKey, table} from '@aws/dynamodb-data-mapper-annotations'
import {beginsWith} from '@aws/dynamodb-expressions'
import {Plan} from '../../models/plan'
import {CATALOG_TABLE} from './index'

export const PLANS_GSI = 'PlansIndex'
export type Currency = 'CAD' | 'USD' | 'MXN'
const KEY_DELIMITER = '|'
const makePlanKey = (currency: Currency) => [currency].join(KEY_DELIMITER)
const parsePlanKey = (key: string) => {
    const [currency] = key.split(KEY_DELIMITER)
    return {currency: (currency as Currency)}
}
export const planCondition = (currency: Currency) =>
    ({subject: 'plan', ...beginsWith(currency)})

@table(CATALOG_TABLE)
export class DDBPlan implements Plan {
    @hashKey()
    productId: string

    @rangeKey()
    plan: string

    @attribute({indexKeyConfigurations: {[PLANS_GSI]: 'HASH'}})
    planId: string

    @attribute({defaultProvider: () => new Date})
    createdAt: Date

    @attribute()
    name: string

    @attribute()
    description?: string

    @attribute()
    price: number

    @attribute()
    startDate?: Date

    @attribute()
    endDate?: Date

    @attribute()
    stripePlanId?: string

    get currency() {
        return parsePlanKey(this.plan).currency
    }

    set currency(currency: Currency) {
        this.plan = makePlanKey(currency)
    }
}
