
interface EntitlementsObject {
    [resourceId: string]: Entitlement
}

export interface Entitlement {
    value: number
    cumulative?: boolean
}

export interface Product {
    productId: string
    createdAt: Date
    name: string
    description?: string
    entitlements: Map<string, Entitlement>
    stripeProductId?: string
}

export interface CreateProductInput {
    name: string
    description?: string
    entitlements: EntitlementsObject
    stripeProductId?: string
}

export interface CreateProductOutput {
    productId: string
}

export interface DeleteProductInput {
    productId: string
}

export interface ModifyProductInput {
    productId: string
    name?: string
    description?: string
    entitlements?: EntitlementsObject
    addEntitlements?: EntitlementsObject
    removeEntitlements?: string[]
    stripeProductId?: string
}
