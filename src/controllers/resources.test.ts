import app, {resourceDao} from '../app'
import request from 'supertest'
import {v4 as uuid} from 'uuid'
import {CreateResourceInput, ModifyResourceInput, Resource} from '../models/resource'

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

jest.setTimeout(60 * 1000);
describe('Resources', () => {
    afterAll(async () => {
        await Promise.all(createdResourceIds.map(resourceId => resourceDao.deleteResource(resourceId)))
    })

    describe('PUT /resources - CreateResource', () => {
        it('Creates a new resource', async () => {
            const input: CreateResourceInput = {
                name: 'test-create',
                meteringType: 'boolean',
                defaultValue: 0,
            }
            const result = await request(app).put('/resources').send(input)
            expect(result.status).toEqual(200)
            createdResourceIds.push(result.body.resourceId)
        })
        it('Creates a new resource with given ID', async () => {
            const input: CreateResourceInput = {
                resourceId: uuid(),
                name: 'test-create-with-id',
                meteringType: 'boolean',
                defaultValue: 0,
            }
            const result = await request(app).put('/resources').send(input)
            expect(result.status).toEqual(200)
            createdResourceIds.push(result.body.resourceId)
        })
        it('Updates an existing resource', async () => {
            const {resourceId} = await createTestResource('update')
            const input: ModifyResourceInput = {
                resourceId,
                name: 'foo-test-2',
            }
            const res = await request(app).put('/resources').send(input)
            expect(res.status).toEqual(200)
            expect(res.body.resourceId).toEqual(resourceId)
            const resource = await resourceDao.getResource(resourceId)
            expect(resource.name).toEqual(input.name)
        })
    })

    describe('GET /resources - ListResources', () => {
        it('Responds', async () => {
            const result = await request(app).get('/resources')
            expect(result.status).toEqual(200)
            expect(result.body).toHaveProperty('resources')
            expect(Array.isArray(result.body.resources)).toBe(true)
        })
    })

    describe('GET /resources/{id} - GetResource', () => {
        it('Gets a resource', async () => {
            const { resourceId, ...resource } = await createTestResource('get')

            const response = await request(app).get(`/resources/${resourceId}`)
            expect(response.status).toEqual(200)
            expect(response.body).toHaveProperty('resource')
            const r = (response.body.resource as Resource)
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
