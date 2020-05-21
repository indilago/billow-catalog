
type EntitlementsObject = {[resourceId: string]: Entitlement}

export interface Entitlement {
    value: number
    cumulative: boolean
}

export interface Product {
    productId: string
    name: string
    description?: string
    createdAt: Date
    entitlements: Map<string, Entitlement>
}

export interface CreateProductInput {
    name: string
    description?: string
    entitlements: EntitlementsObject
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
}
