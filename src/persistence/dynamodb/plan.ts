import {attribute, hashKey, rangeKey, table} from '@aws/dynamodb-data-mapper-annotations'
import {beginsWith, ConditionExpression, equals, notEquals} from '@aws/dynamodb-expressions'
import {v4 as uuid} from 'uuid'
import {Plan, ModifyPlanInput, CreatePlanInput} from '../../models/plan'
import {CATALOG_TABLE, fetchAll, logError} from './index'
import PlanDao from '../plan-dao'
import {DataMapper, ItemNotFoundException, QueryIterator, ScanOptions} from '@aws/dynamodb-data-mapper'
import {AWSError} from 'aws-sdk'
import {BadInputError, NotFoundError} from '../../exceptions'

export const PLANS_GSI = 'PlansIndex'
export type Currency = 'CAD' | 'USD' | 'MXN'
const KEY_DELIMITER = '|'
export const PLAN_ITEM_PREFIX = '$plan:'
const makePlanKey = (currency: Currency, name: string) => PLAN_ITEM_PREFIX + [currency, name].join(KEY_DELIMITER)
const parsePlanKey = (key: string) => {
    const prefixPattern = new RegExp(`^${PLAN_ITEM_PREFIX.replace('$', '\\$')}`)
    const [currency, name] = key.replace(prefixPattern, '').split(KEY_DELIMITER)
    return {currency: (currency as Currency), name}
}
export const planCondition = (currency?: Currency) => ({subject: 'plan', ...beginsWith(PLAN_ITEM_PREFIX + (currency || ''))})

@table(CATALOG_TABLE)
export class DDBPlan implements Plan {
    @hashKey()
    productId: string

    @rangeKey()
    plan: string

    @attribute({
        indexKeyConfigurations: {[PLANS_GSI]: 'HASH'},
        defaultProvider: () => uuid(),
    })
    planId: string

    @attribute({defaultProvider: () => new Date})
    createdAt: Date

    @attribute({attributeName: 'name'})
    _name: string

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
        this.plan = makePlanKey(currency, this.name)
    }

    get name() {
        return this._name
    }

    set name(name: string) {
        this._name = name
        this.plan = makePlanKey(this.currency, name)
    }

    toPlan(): Plan {
        const p = { ...this, currency: this.currency, name: this.name }
        delete p.plan
        delete p._name
        return p
    }
}

export class DDBPlanDao implements PlanDao {
    constructor(private readonly mapper: DataMapper) {
    }

    getPlan(planId: string): Promise<Plan> {
        return fetchAll(this.mapper.query(DDBPlan, {planId}, {indexName: PLANS_GSI}))
            .then(results => {
                if (!results.length) {
                    return null
                }
                return results[0].toPlan()
            })
    }

    createPlan(input: CreatePlanInput): Promise<Plan> {
        const item = Object.assign(new DDBPlan, {
            productId: input.productId,
            currency: input.currency,
            name: input.name,
            description: input.description,
            stripePlanId: input.stripePlanId,
        })
        const options = {condition: { subject: 'plan', ...notEquals(makePlanKey(input.currency, input.name))}}
        // const options = {}
        return this.mapper.put(item, options)
            .then(plan => plan.toPlan())
            .catch(err => {
                if ((err as AWSError).code === 'ConditionalCheckFailedException') {
                    throw new BadInputError(['Plan with input combination of (productId, currency, name) exists'])
                }
                throw err
            })
            .catch(logError('Failed to insert Plan'))
    }

    deletePlan(planId: string): Promise<Plan> {
        return this.getPlan(planId)
            .then(plan => {
                if (plan) {
                    return this.mapper.delete(Object.assign(new DDBPlan, plan))
                        .then(plan => plan.toPlan())
                }
                return null
            })
            .catch(logError('Failed to delete Plan'))
    }

    updatePlan(input: ModifyPlanInput): Promise<Plan> {
        return this.getPlan(input.planId)
            .then(async item => {
                if (!item) {
                    throw new NotFoundError()
                }
                const updated = Object.assign(new DDBPlan, {...item, ...input})
                if (makePlanKey(item.currency, item.name) !== makePlanKey(updated.currency, updated.name)) {
                    // Ideally we would transactionally put a new item and delete the old one
                    // but the js data mapper currently doesn't support transactions.
                    for await (const result of this.mapper.batchWrite([
                        ['put', updated],
                        ['delete', Object.assign(new DDBPlan, item)],
                    ])) {
                        if (result[0] === 'put') {
                            return result[1] as DDBPlan
                        }
                    }
                }
                return this.mapper.put(updated)
            })
            .then(plan => plan.toPlan())
    }

    private queryPlans(productId: string, currency?: Currency): QueryIterator<DDBPlan> {
        const condition: ConditionExpression = {
            type: 'And',
            conditions: [
                {subject: 'productId', ...equals(productId)},
                planCondition(currency),
            ]
        }

        return this.mapper.query(DDBPlan, condition)
    }

    private scanPlans(currency?: Currency): QueryIterator<DDBPlan> {
        const options: ScanOptions = {
            indexName: PLANS_GSI,
            filter: { subject: 'plan', ...beginsWith(PLAN_ITEM_PREFIX)},
        }
        if (currency) {
            options.filter = { type: 'And', conditions: [options.filter, planCondition(currency)] }
        }

        return this.mapper.scan(DDBPlan, options)
    }

    listPlans(productId?: string, currency?: Currency, effectiveDate?: Date): Promise<Plan[]> {
        const query = productId ? this.queryPlans(productId, currency) : this.scanPlans(currency)
        return fetchAll(query, {
            filter: plan => {
                const validStart = (!plan.startDate || plan.startDate <= effectiveDate)
                const validEnd = (!plan.endDate || plan.endDate >= effectiveDate)
                if (validStart && validEnd) {
                    return true
                }
                console.debug(`[listPlans] Excluding record for effective date ${effectiveDate} (${plan.startDate} - ${plan.endDate})`)
                return false
            }
        }).then(plans => plans.map(plan => plan.toPlan()))
    }
}
