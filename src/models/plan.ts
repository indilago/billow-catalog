export type Currency = 'CAD' | 'USD' | 'MXN'

export interface Plan {
    planId: string
    createdAt: Date
    productId: string
    name: string
    currency: Currency
    description?: string
    stripePlanId?: string
}

export interface CreatePlanInput {
    name: string
    productId: string
    currency: Currency
    description?: string
    stripePlanId?: string
}

export interface ModifyPlanInput {
    planId: string
    name?: string
    description?: string
    stripePlanId?: string
}
