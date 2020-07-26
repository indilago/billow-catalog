import {DataMapper} from '@aws/dynamodb-data-mapper'
import {attribute, hashKey, rangeKey, table} from '@aws/dynamodb-data-mapper-annotations'
import {fetchAll, isResourceNotFound, logError, SUBSCRIPTIONS_TABLE} from './index'
import {Subscription} from '../../models/subscription'
import SubscriptionDao, {
    DeleteSubscriptionInput,
    GetSubscriptionInput,
    ListSubscriptionsByAccountInput,
    ListSubscriptionsByPlanInput,
    PutSubscriptionInput
} from '../subscription-dao'

const PLAN_INDEX = process.env.SUBSCRIPTIONS_PLAN_INDEX || 'PlanIndex'

@table(SUBSCRIPTIONS_TABLE)
export class DDBSubscription implements Subscription {
    @hashKey()
    accountId: string

    @rangeKey({indexKeyConfigurations: {[PLAN_INDEX]: 'HASH'}})
    planId: string

    @attribute({defaultProvider: () => new Date})
    readonly createdAt: Date

    @attribute()
    expiresAt?: Date

    @attribute()
    stripeSubscriptionId?: string
}

export class DDBSubscriptionDao implements SubscriptionDao {
    constructor(private readonly mapper: DataMapper) {
    }

    deleteSubscription({ accountId, planId }: DeleteSubscriptionInput): Promise<Subscription|null> {
        return this.getSubscription({ accountId, planId })
            .then(subscription => {
                if (subscription) {
                    return this.mapper.delete(subscription)
                }
                return null
            })
            .catch(logError('Failed to delete Subscription'))
    }

    getSubscription({ accountId, planId }: GetSubscriptionInput): Promise<Subscription|null> {
        return this.mapper.get(Object.assign(new DDBSubscription, { accountId, planId }))
            .catch(err => {
                if (isResourceNotFound(err)) {
                    return null
                }
                logError(`Failed to get subscription ${accountId}/${planId}`)(err)
            })
    }

    listSubscriptionsByAccount(input: ListSubscriptionsByAccountInput): Promise<Subscription[]> {
        return fetchAll(this.mapper.query(DDBSubscription,
            { accountId: input.accountId },
            { limit: input.limit }))
            .catch(logError('Failed to list subscriptions by account'))
    }

    listSubscriptionsByPlan(input: ListSubscriptionsByPlanInput): Promise<Subscription[]> {
        return fetchAll(this.mapper.query(DDBSubscription,
                { planId: input.planId },
                { indexName: PLAN_INDEX, limit: input.limit }))
            .catch(logError('Failed to list subscriptions by plan'))
    }

    putSubscription(input: PutSubscriptionInput): Promise<Subscription> {
        if (input.expiresAt === null) {
            delete input.expiresAt
        }
        if (input.stripeSubscriptionId === null) {
            delete input.stripeSubscriptionId
        }
        const updated = Object.assign(new DDBSubscription, input)
        return this.mapper.put(updated)
            .catch(logError(`Failed to put subscription ${input}`))
    }
}
