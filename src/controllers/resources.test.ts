import request from 'supertest'
import {v4 as uuid} from 'uuid'
import app, {productDao, resourceDao} from '../app'
import {CreateResourceInput, ModifyResourceInput, Resource} from '../models/resource'
import {ModifyProductInput} from '../models/product'

const createdResourceIds: string[] = []
const createTestResource = async (name: string) => {
    const input: CreateResourceInput = {
        name: `test-${name}`,
        description: 'test',
        meteringType: 'boolean',
        defaultValue: 0,
    }
    const { resourceId } = await resourceDao.createResource(input)
    createdResourceIds.push(resourceId)
    return { ...input, resourceId }
}

describe('Resources', () => {
    afterAll(async () => {
        await Promise.all(createdResourceIds.map(resourceId => resourceDao.deleteResource(resourceId)))
    })

    describe('PUT /resources - PutResource', () => {
        it('Creates a new resource', async () => {
            const input: CreateResourceInput = {
                name: 'test-create',
                meteringType: 'boolean',
                defaultValue: 0,
            }
            const result = await request(app).put('/resources').send(input)
            expect(result.status).toEqual(200)
            expect(result.body.resource).toBeDefined()
            const resource = result.body.resource as Resource
            expect(resource.resourceId).toBeDefined()
            expect(resource.createdAt).toBeDefined()
            expect(resource.name).toEqual(input.name)
            expect(resource.meteringType).toEqual(input.meteringType)
            expect(resource.defaultValue).toEqual(input.defaultValue)
            createdResourceIds.push(resource.resourceId)
        })

        it('Creates a new resource with given ID', async () => {
            const input: CreateResourceInput = {
                resourceId: uuid(),
                name: 'test-create-with-id',
                meteringType: 'boolean',
                defaultValue: 1,
            }
            const result = await request(app).put('/resources').send(input)
            expect(result.status).toEqual(200)
            const resource = result.body.resource as Resource
            expect(resource.resourceId).toEqual(input.resourceId)
            expect(resource.name).toEqual(input.name)
            expect(resource.meteringType).toEqual(input.meteringType)
            expect(resource.createdAt).toBeDefined()
            expect(resource.defaultValue).toEqual(input.defaultValue)
            createdResourceIds.push(resource.resourceId)
        })

        it('Updates an existing resource', async () => {
            const {resourceId} = await createTestResource('update')
            const input: ModifyResourceInput = {
                resourceId,
                name: 'foo-test-2',
            }
            const res = await request(app).put('/resources').send(input)
            expect(res.status).toEqual(200)
            const resource = res.body.resource as Resource
            expect(resource.resourceId).toEqual(input.resourceId)
            expect(resource.name).toEqual(input.name)
            const dbResource = await resourceDao.getResource(resourceId)
            expect(dbResource.name).toEqual(input.name)
        })
    })

    describe('PATCH /resources/{resourceId} - UpdateResource', () => {
        it('Updates an existing resource', async () => {
            const {resourceId} = await createTestResource('update')
            const input: ModifyResourceInput = {
                resourceId,
                name: 'foo-test-2',
            }
            const res = await request(app).patch(`/resources/${resourceId}`).send(input)
            expect(res.status).toEqual(200)
            expect(res.body.resource).toBeDefined()
            const resource = res.body.resource as Resource
            expect(resource.resourceId).toEqual(resourceId)
            expect(resource.name).toEqual(input.name)
            const dbResource = await resourceDao.getResource(resourceId)
            expect(dbResource.name).toEqual(input.name)
        })
        it('Throws a 404 when nonexistent', async () => {
            const input: ModifyResourceInput = {
                resourceId: uuid(),
                name: 'foo-test-2',
            }
            const response = await request(app).patch(`/resources/${input.resourceId}`).send(input)
            expect(response.status).toEqual(404)
        })
    })

    describe('GET /resources - ListResources', () => {
        it('Responds with a list of resources', async () => {
            const {resourceId} = await createTestResource('list')
            const result = await request(app).get('/resources')
            expect(result.status).toEqual(200)
            expect(result.body.resources).toBeDefined()
            expect(Array.isArray(result.body.resources)).toBe(true)
            const resources = result.body.resources as Resource[]
            expect(resources.find(r => r.resourceId === resourceId)).toBeDefined()
        })
    })

    describe('GET /resources/{resourceId} - GetResource', () => {
        it('Gets a resource', async () => {
            const { resourceId, ...resource } = await createTestResource('get')

            const response = await request(app).get(`/resources/${resourceId}`)
            expect(response.status).toEqual(200)
            expect(response.body).toHaveProperty('resource')
            const r = response.body.resource as Resource
            expect(r.resourceId).toEqual(resourceId)
            expect(r.name).toEqual(resource.name)
            expect(r.description).toEqual(resource.description)
        })

        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(`/resources/${uuid()}`)
            expect(response.status).toEqual(404)
        })
    })

    describe('DELETE /resources/{id} - DeleteResource', () => {
        it('Deletes a resource', async () => {
            const { resourceId, ...resource } = await createTestResource('delete')

            const response = await request(app).delete(`/resources/${resourceId}`)
            expect(response.status).toEqual(200)
            expect(response.body.resourceId).toEqual(resourceId)
        })

        it('Gracefully responds on non-existent resource', async () => {
            const response = await request(app).delete(`/resources/${uuid()}`)
            expect(response.status).toEqual(204)
        })
    })

})
