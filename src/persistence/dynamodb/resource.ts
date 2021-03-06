import {
    attribute, autoGeneratedHashKey, rangeKey,
    table,
} from '@aws/dynamodb-data-mapper-annotations'
import {DataMapper} from '@aws/dynamodb-data-mapper'
import {v4 as uuid} from 'uuid'
import {CATALOG_TABLE, fetchAll, logError} from './index'
import {
    CreateResourceInput,
    CreateResourceOutput,
    MeteringType, ModifyResourceInput,
    Resource
} from '../../models/resource'
import {ResourceDao} from '../resource-dao'
import {NotFoundError} from '../../exceptions'
import {log} from 'util'

export const RESOURCES_GSI = 'ResourcesIndex'

@table(CATALOG_TABLE)
export class DDBResource implements Resource {
    /** @deprecated */
    @autoGeneratedHashKey()
    productId: string

    /** @deprecated */
    @rangeKey({defaultProvider: () => '-'})
    plan: string

    @attribute({
        indexKeyConfigurations: {[RESOURCES_GSI]: 'HASH'},
        defaultProvider: () => uuid(),
    })
    resourceId: string

    @attribute({
        indexKeyConfigurations: {[RESOURCES_GSI]: 'RANGE'},
        defaultProvider: () => new Date,
    })
    createdAt: Date

    @attribute()
    name: string

    @attribute()
    description?: string

    @attribute()
    meteringType: MeteringType

    @attribute()
    defaultValue: number
}

export class DDBResourceDao implements ResourceDao {
    constructor(private readonly mapper: DataMapper) {
    }

    async createResource(input: CreateResourceInput): Promise<Resource> {
        const item = Object.assign(new DDBResource, input)
        return this.mapper.put(item)
            .catch(logError('Failed to insert Resource'))
    }

    async deleteResource(resourceId: string): Promise<Resource|null> {
        return this.getResource(resourceId)
            .then(r => {
                if (r) {
                    return this.mapper.delete(r).then(() => r)
                }
                return null
            })
            .catch(logError('Failed to delete Resource'))
    }

    async getResource(resourceId: string): Promise<Resource|null> {
        return fetchAll(this.mapper.query(DDBResource, {resourceId}, {indexName: RESOURCES_GSI}))
            .then(results => {
                if (!results.length) {
                    return null
                }
                return results[0]
            })
            .catch(logError(`Failed to get resource ${resourceId}`))
    }

    async listResources(): Promise<Resource[]> {
        // @todo: cache these results, as the scan is expensive and resources will be relatively static
        const query = this.mapper.scan(DDBResource, {
            indexName: RESOURCES_GSI,
        })
        return fetchAll(query)
            .catch(logError('Failed to list resources'))
    }

    updateResource(input: ModifyResourceInput): Promise<Resource> {
        return this.getResource(input.resourceId)
            .then(item => {
                if (!item) {
                    throw new NotFoundError()
                }
                const updated = Object.assign(new DDBResource, { ...item, ...input })
                return this.mapper.put(updated)
            })
            .catch(logError(`Failed to update resource ${input}`))
    }
}
