
export interface Subscription {
    accountId: string
    planId: string
    createdAt: Date
    expiresAt?: Date
    stripeSubscriptionId?: string
}

