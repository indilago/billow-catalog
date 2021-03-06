import {
    CreateResourceInput,
    CreateResourceOutput,
    ModifyResourceInput,
    Resource
} from '../models/resource'

export interface ResourceDao {
    listResources(): Promise<Resource[]>
    getResource(resourceId: string): Promise<Resource|null>
    createResource(input: CreateResourceInput): Promise<Resource>
    deleteResource(resourceId: string): Promise<Resource|null>
    updateResource(input: ModifyResourceInput): Promise<Resource>
}
