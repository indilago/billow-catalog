import {DataMapper, embed} from '@aws/dynamodb-data-mapper'
import {attribute, autoGeneratedHashKey, rangeKey, table} from '@aws/dynamodb-data-mapper-annotations'
import {equals} from '@aws/dynamodb-expressions'
import {CATALOG_TABLE, fetchAll, isResourceNotFound, logError} from './index'
import {CreateProductInput, Entitlement, ModifyProductInput, Product} from '../../models/product'
import {ResourceDao} from '../resource-dao'
import {ProductDao} from '../product-dao'
import {NotFoundError} from '../../exceptions'

class DDBEntitlement implements Entitlement {
    @attribute()
    value: number

    @attribute()
    cumulative: boolean
}

export const PRODUCT_METADATA_VALUE = '$metadata'

export const productItemKey = (productId: string) =>
    Object.assign(new DDBProduct, {productId, plan: PRODUCT_METADATA_VALUE})

const objectToMap = <T> (obj: {[key: string]: T}): Map<string, T> => {
    const map = new Map()
    for (const key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue
        }
        map.set(key, obj[key])
    }
    return map
}

@table(CATALOG_TABLE)
export class DDBProduct implements Product {
    @autoGeneratedHashKey()
    productId: string

    // This is '$metadata' for product items, and plan parameters for plans
    @rangeKey({defaultProvider: () => PRODUCT_METADATA_VALUE})
    readonly plan: string

    @attribute({defaultProvider: () => new Date})
    createdAt: Date

    @attribute()
    name: string

    @attribute()
    description?: string

    @attribute({memberType: embed(DDBEntitlement)})
    entitlements: Map<string, Entitlement>

    @attribute()
    stripeProductId?: string
}

export class DDBProductDao implements ProductDao {
    constructor(private readonly mapper: DataMapper,
                private readonly resourceDao: ResourceDao) {
    }

    async createProduct(input: CreateProductInput): Promise<Product> {
        const item = Object.assign(new DDBProduct, input)
        if (item.description === null) {
            delete item.description
        }
        if (item.stripeProductId === null) {
            delete item.stripeProductId
        }
        return this.mapper.put(item)
            .then(product => {
                const p = (product as Product)
                // @ts-ignore
                delete p.plan
                return product
            })
            .catch(logError('Failed to insert Product ' + JSON.stringify(input)))
    }

    async deleteProduct(productId: string): Promise<Product|null> {
        return this.getProduct(productId)
            .then(r => {
                if (r) {
                    return this.mapper.delete(r).then(() => r)
                }
                return null
            })
            .catch(logError('Failed to delete Product'))
    }

    async getProduct(productId: string): Promise<Product|null> {
        return this.mapper.get(productItemKey(productId))
            .catch(err => {
                if (isResourceNotFound(err)) {
                    return null
                }
                logError(`Failed to get product ${productId}`)(err)
            })
    }

    async listProducts(): Promise<Product[]> {
        const query = this.mapper.scan(DDBProduct, {
            filter: { subject: 'plan', ...equals(PRODUCT_METADATA_VALUE) },
        })
        return fetchAll(query)
            .catch(logError('Failed to list products'))
    }

    updateProduct(input: ModifyProductInput): Promise<Product> {
        return this.getProduct(input.productId)
            .then(async item => {
                if (!item) {
                    throw new NotFoundError()
                }
                let entitlements = item.entitlements
                if (input.hasOwnProperty('entitlements')) {
                    entitlements = await this.sanitizeEntitlements(input.entitlements)
                }
                if (input.addEntitlements) {
                    (await this.sanitizeEntitlements(input.addEntitlements))
                        .forEach((entitlement, resourceId) => {
                        entitlements.set(resourceId, entitlement)
                    })
                }
                if (input.removeEntitlements) {
                    input.removeEntitlements.forEach(resourceId => entitlements.delete(resourceId))
                }
                const updates: Partial<DDBProduct> = {}
                if (entitlements !== item.entitlements) {
                    updates.entitlements = entitlements
                }
                if (input.hasOwnProperty('name') && input.name !== item.name) {
                    updates.name = input.name
                }
                if (input.hasOwnProperty('description') && input.description != item.description) {
                    updates.description = input.description
                }
                if (input.hasOwnProperty('stripeProductId') && input.stripeProductId != item.stripeProductId) {
                    updates.stripeProductId = input.stripeProductId
                }
                const updated = Object.assign(new DDBProduct, { ...item, ...updates })
                return this.mapper.put(updated)
            })
            .catch(logError(`Failed to update product ${input}`))
    }

    private async sanitizeEntitlements(entitlements: {[resourceId: string]: Entitlement}) {
        const resources = (await this.resourceDao.listResources())
            .reduce<Set<string>>((resourceSet, resource) => {
                resourceSet.add(resource.resourceId)
                return resourceSet
            }, new Set([]))
        const sanitized = new Map<string, Entitlement>()
        for (const resourceId in entitlements) {
            if (!resources.has(resourceId)) {
                console.log('Invalid resourceId', resourceId)
                return
            }
            sanitized.set(resourceId, prepareEntitlementForDynamo(entitlements[resourceId]))
        }
        return sanitized
    }
}

/**
 * Just in case the input has booleans in the 'value' field, cast it to a number
 */
function prepareEntitlementForDynamo(entitlement: Entitlement) {
    return {
        value: +entitlement.value,
        cumulative: !!entitlement.cumulative,
    }
}
