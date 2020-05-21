export type MeteringType = 'boolean' | 'maximum'

export interface Resource {
    resourceId: string
    name: string
    description?: string
    meteringType: MeteringType
    defaultValue: number
    createdAt: Date
}

export interface CreateResourceInput {
    resourceId?: string
    name: string
    description?: string
    meteringType: MeteringType
    defaultValue: number
}

export interface CreateResourceOutput {
    resourceId: string
}

export interface ModifyResourceInput {
    resourceId: string
    name?: string
    description?: string
    meteringType?: MeteringType
    defaultValue?: number
}
