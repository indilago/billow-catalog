import {MeteringType} from './resource'

export interface Plan {
    planId: string
    createdAt: Date
    name: string
    description?: string
    stripePlanId?: string
}

export interface CreatePlanInput {
    name: string
    description?: string
    stripePlanId?: string
}

export interface CreatePlanOutput {
    planId: string
}

export interface ModifyPlanInput {
    planId: string
    name?: string
    description?: string
    stripePlanId?: string
}
