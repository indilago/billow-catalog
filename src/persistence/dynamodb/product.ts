import {embed} from '@aws/dynamodb-data-mapper'
import {attribute, hashKey, rangeKey, table} from '@aws/dynamodb-data-mapper-annotations'
import {CATALOG_TABLE} from './index'
import {Entitlement, Product} from '../../models/product'

class DDBEntitlement implements Entitlement {
    @attribute()
    value: number

    @attribute()
    cumulative: boolean
}

export const PRODUCT_METADATA_VALUE = '$metadata'

@table(CATALOG_TABLE)
export class DDBProduct implements Product {
    @hashKey()
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
}
