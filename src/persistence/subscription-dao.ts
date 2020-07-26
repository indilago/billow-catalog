import {Subscription} from '../models/subscription'

export interface PutSubscriptionInput {
    accountId: string
    planId: string
    expiresAt?: Date
    stripeSubscriptionId?: string
}

export interface ListSubscriptionsByPlanInput {
    planId: string
    limit?: number
}

export interface ListSubscriptionsByAccountInput {
    accountId: string
    limit?: number
}

export interface GetSubscriptionInput {
    accountId: string
    planId: string
}

export interface DeleteSubscriptionInput {
    accountId: string
    planId: string
}

export default interface SubscriptionDao {
    listSubscriptionsByPlan(input: ListSubscriptionsByPlanInput): Promise<Subscription[]>
    listSubscriptionsByAccount(input: ListSubscriptionsByAccountInput): Promise<Subscription[]>
    getSubscription(input: GetSubscriptionInput): Promise<Subscription|null>
    deleteSubscription(input: DeleteSubscriptionInput): Promise<Subscription|null>
    putSubscription(input: PutSubscriptionInput): Promise<Subscription>
}
