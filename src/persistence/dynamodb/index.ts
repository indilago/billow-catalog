import {DataMapper, DynamoDbSchema, ItemNotFoundException, QueryIterator} from '@aws/dynamodb-data-mapper'
import {DataMapperConfiguration} from '@aws/dynamodb-data-mapper/build/namedParameters'
import {DDBProduct, PRODUCT_METADATA_VALUE} from './product'
import {Currency, DDBPlan, planCondition, PLANS_GSI} from './plan'
import {DeleteProductInput, Product} from '../../models/product'
import {Plan} from '../../models/plan'
import {ProductDao} from '../product-dao'
import DynamoDBClient from 'aws-sdk/clients/dynamodb'
import PlanDao from '../plan-dao'

export const CATALOG_TABLE = process.env.CATALOG_TABLE || 'BillowCatalog'
const DEFAULT_QUERY_LIMIT = 1000
const DEFAULT_FILTER = () => true

export const isResourceNotFound = (err: Error) => { return err.name === 'ItemNotFoundException' }


/**
 * Fetches all items from a paginated DynamoDB response
 */
export async function fetchAll<T>(query: QueryIterator<T>, params?: { limit?: number, filter?: (item: T) => boolean }): Promise<T[]> {
    const limit = params?.limit || DEFAULT_QUERY_LIMIT
    const filter = params?.filter || DEFAULT_FILTER
    const items: T[] = []
    for await (const item of query) {
        if (!filter(item)) {
            continue
        }
        items.push(item)
        if (items.length >= limit) {
            break
        }
    }
    return items
}

/**
 * Logs and rethrows an error
 */
export const logError = (message: string) => (err: Error) => {
    console.error(message, err)
    throw err
}

export default class DynamoDbDaos implements PlanDao {
    private mapper: DataMapper

    constructor(config: DataMapperConfiguration) {
        this.mapper = new DataMapper(config)
    }

    public static default() {
        return new DynamoDbDaos({client: new DynamoDBClient()})
    }

    async listPlans(productId: string, currency: Currency, effectiveDate: Date): Promise<Plan[]> {
        const query = this.mapper.query(DDBPlan, planCondition(currency), {indexName: PLANS_GSI})
        return fetchAll(query, {
            filter: plan => {
                const validStart = (!plan.startDate || plan.startDate <= effectiveDate)
                const validEnd = (!plan.endDate || plan.endDate >= effectiveDate)
                if (validStart && validEnd) {
                    return true
                }
                console.log(`[getPlans] Excluding record for effective date ${effectiveDate} (${plan.startDate} - ${plan.endDate})`)
                return false
            }
        })
    }
}
