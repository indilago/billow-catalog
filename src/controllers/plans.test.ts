import request from 'supertest'
import {v4 as uuid} from 'uuid'
import app, {planDao, productDao} from '../app'
import {CreateProductInput} from '../models/product'
import {CreatePlanInput, Currency, ModifyPlanInput, Plan} from '../models/plan'

const createdProductIds: string[] = []
const createdPlanIds: string[] = []

const createTestProduct = async (name: string) => {
    const input: CreateProductInput = {
        name: `test-${name}`,
        description: 'test',
        entitlements: {}
    }
    const {productId} = await productDao.createProduct(input)
    createdProductIds.push(productId)
    return {...input, productId}
}
const createTestPlan = async (name: string, currency: Currency = 'CAD', productId?: string) => {
    if (!productId) {
        const product = await createTestProduct(name)
        productId = product.productId
    }
    const input: CreatePlanInput = {
        productId,
        name: `test-${name}`,
        description: 'test',
        currency,
    }
    const {planId} = await planDao.createPlan(input)
    createdPlanIds.push(planId)
    return {...input, planId}
}

describe('Plans', () => {
    afterAll(async () => {
        await Promise.all(createdPlanIds.map(planId => planDao.deletePlan(planId)))
        await Promise.all(createdProductIds.map(productId => productDao.deleteProduct(productId)))
    })

    describe('POST /plans - CreatePlan', () => {
        it('Creates a new plan', async () => {
            const {productId} = await createTestProduct('foo')
            const input: CreatePlanInput = {
                name: 'test-create',
                currency: 'USD',
                productId,
            }
            const result = await request(app).post('/plans').send(input)
            expect(result.status).toEqual(200)
            expect(result.body.plan).toBeDefined()
            const plan = result.body.plan as Plan
            expect(plan.planId).toBeTruthy()
            expect(plan.name).toEqual(input.name)
            expect(plan.currency).toEqual(input.currency)
            expect(plan.productId).toEqual(input.productId)
            createdPlanIds.push(plan.planId)
        })

        it('Throws 400 for bad currency', async () => {
            const {productId} = await createTestProduct('foo')
            const input: CreatePlanInput = {
                productId,
                name: 'test-create-400',
                currency: 'CAD',
            }
            // @ts-ignore
            input.currency = 'BAD'
            const result = await request(app).post('/plans').send(input)
            expect(result.status).toEqual(400)
        })

        it('Throws 400 for invalid productId', async () => {
            const input: CreatePlanInput = {
                productId: uuid(),
                name: 'test-create-400',
                currency: 'CAD',
            }
            const result = await request(app).post('/plans').send(input)
            expect(result.status).toEqual(400)
        })

        it('Throws 400 for duplicate product, currency, and name', async () => {
            const {productId} = await createTestProduct('foo')
            const input: CreatePlanInput = {
                productId,
                name: 'test-create-400',
                currency: 'CAD',
            }
            const result = await request(app).post('/plans').send(input)
            expect(result.status).toEqual(200)
            createdPlanIds.push(result.body.plan.planId)
            const result2 = await request(app).post('/plans').send(input)
            expect(result2.status).toEqual(400)
            const result3 = await request(app).post('/plans').send({ ...input, currency: 'USD'})
            expect(result3.status).toEqual(200)
            createdPlanIds.push(result3.body.plan.planId)
            const result4 = await request(app).post('/plans').send({ ...input, name: 'changed-name'})
            expect(result4.status).toEqual(200)
            createdPlanIds.push(result4.body.plan.planId)
        })
    })

    describe('PATCH /plans/{planId} - ModifyPlan', () => {
        it('Updates an existing plan', async () => {
            const {planId} = await createTestPlan('update-exist')
            const input: ModifyPlanInput = {
                planId,
                name: 'foo-test-2',
            }
            const res = await request(app).patch(`/plans/${planId}`).send(input)
            expect(res.status).toEqual(200)
            expect(res.body.plan).toBeDefined()
            const planResponse = res.body.plan as Plan
            expect(planResponse.planId).toEqual(planId)
            expect(planResponse.name).toEqual(input.name)
            const dbPlan = await planDao.getPlan(planId)
            expect(dbPlan.name).toEqual(input.name)
        })

        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(`/plans/${uuid()}`)
            expect(response.status).toEqual(404)
        })
    })

    describe('GET /plans - ListPlans', () => {
        it('Returns all plans', async () => {
            const {planId} = await createTestPlan('query-1')
            const result = await request(app).get('/plans')
            expect(result.status).toEqual(200)
            expect(result.body.plans).toBeDefined()
            expect(Array.isArray(result.body.plans)).toBe(true)
            const plans = result.body.plans as Plan[]
            expect(plans.find(r => r.planId === planId)).toBeDefined()
        })

        it('Returns plans for a product', async () => {
            const {planId, productId} = await createTestPlan('query')
            const plan2 = await createTestPlan('query-2', 'USD', productId)
            const result = await request(app).get(`/plans?productId=${productId}`)
            expect(result.status).toEqual(200)
            const plans = result.body.plans as Plan[]
            expect(plans).toHaveLength(2)
            expect(plans.find(p => p.planId === planId)).toBeDefined()
            expect(plans.find(p => p.planId === plan2.planId)).toBeDefined()
        })

        it('Returns plans for a product and currency', async () => {
            const {planId, productId, currency} = await createTestPlan('query-3a', 'CAD')
            await createTestPlan('query-3b', 'USD', productId)
            const result = await request(app).get(`/plans?productId=${productId}&currency=${currency}`)
            expect(result.status).toEqual(200)
            const plans = result.body.plans as Plan[]
            expect(plans.find(p => p.planId === planId)).toBeDefined()
        })
    })

    describe('GET /plans/{planId} - GetPlan', () => {
        it('Gets a plan', async () => {
            const {planId, ...plan} = await createTestPlan('get')

            const response = await request(app).get(`/plans/${planId}`)
            expect(response.status).toEqual(200)
            expect(response.body.plan).toBeDefined()
            const p = response.body.plan as Plan
            expect(p.planId).toEqual(planId)
            expect(p.name).toEqual(plan.name)
            expect(p.description).toEqual(plan.description)
        })

        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(`/plans/${uuid()}`)
            expect(response.status).toEqual(404)
        })
    })

    describe('DELETE /plans/{planId} - DeletePlan', () => {
        it('Deletes a plan', async () => {
            const {planId} = await createTestPlan('delete')

            const response = await request(app).delete(`/plans/${planId}`)
            expect(response.status).toEqual(200)
            expect(response.body.planId).toEqual(planId)
            const dbPlan = await planDao.getPlan(planId)
            expect(dbPlan).toBeNull()
        })

        it('Gracefully responds on non-existent plan', async () => {
            const response = await request(app).delete(`/plans/${uuid()}`)
            expect(response.status).toEqual(204)
        })
    })

})
