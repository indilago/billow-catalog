import request from 'supertest'
import {v4 as uuid} from 'uuid'
import app, {planDao, productDao, subscriptionDao} from '../app'
import {CreateProductInput} from '../models/product'
import {CreatePlanInput, Currency} from '../models/plan'
import {PutSubscriptionInput} from '../persistence/subscription-dao'
import {Subscription} from '../models/subscription'

const createdProductIds: string[] = []
const createdPlanIds: string[] = []
const createdSubscriptions: {accountId: string, planId: string}[] = []

async function createTestProduct(name: string) {
    const input: CreateProductInput = {
        name: `test-${name}`,
        description: 'test',
        entitlements: {}
    }
    const {productId} = await productDao.createProduct(input)
    createdProductIds.push(productId)
    return {...input, productId}
}
async function createTestPlan(name: string, currency: Currency = 'CAD', productId?: string) {
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
async function createTestSubscription(accountId: string, planId?: string) {
    if (!planId) {
        const plan = await createTestPlan(`test-${accountId}`)
        planId = plan.planId
    }
    const input: PutSubscriptionInput = {
        accountId,
        planId,
    }
    const subscription = await subscriptionDao.putSubscription(input)
    createdSubscriptions.push({accountId, planId})
    return subscription
}

describe('Subscriptions', () => {
    afterAll(async () => {
        await Promise.all(createdSubscriptions.map(key => subscriptionDao.deleteSubscription(key)))
        await Promise.all(createdPlanIds.map(planId => planDao.deletePlan(planId)))
        await Promise.all(createdProductIds.map(productId => productDao.deleteProduct(productId)))
    })

    describe('PUT /accounts/{accountId}/subscriptions/{planId} - CreateSubscription', () => {
        const makeUri = (accountId: string, planId: string) => `/accounts/${accountId}/subscriptions/${planId}`

        it('Creates a new subscription', async () => {
            const {planId} = await createTestPlan('create')
            const input: PutSubscriptionInput = {
                accountId: uuid(),
                planId,
            }
            const result = await request(app).put(makeUri(input.accountId, planId)).send(input)
            expect(result.status).toEqual(200)
            expect(result.body.subscription).toBeDefined()
            const subscription = result.body.subscription as Subscription
            expect(subscription.accountId).toEqual(input.accountId)
            expect(subscription.planId).toEqual(input.planId)
            expect(subscription.createdAt).toBeTruthy()
            expect(subscription.expiresAt).toBeUndefined()
            expect(subscription.stripeSubscriptionId).toBeUndefined()
            createdSubscriptions.push({accountId: input.accountId, planId })
        })

        it('Accepts optional fields', async () => {
            const {planId} = await createTestPlan('create2')
            const input: PutSubscriptionInput = {
                accountId: uuid(),
                planId,
                expiresAt: new Date('2021-04-01'),
                stripeSubscriptionId: uuid(),
            }
            const result = await request(app).put(makeUri(input.accountId, planId)).send(input)
            expect(result.status).toEqual(200)
            expect(result.body.subscription).toBeDefined()
            const subscription = result.body.subscription as Subscription
            expect(subscription.accountId).toEqual(input.accountId)
            expect(subscription.planId).toEqual(input.planId)
            expect(subscription.createdAt).toBeTruthy()
            expect(subscription.expiresAt).toEqual(input.expiresAt.toISOString())
            expect(subscription.stripeSubscriptionId).toEqual(input.stripeSubscriptionId)
            createdSubscriptions.push({accountId: input.accountId, planId })
        })

        it('Throws 400 for bad planId', async () => {
            const input: PutSubscriptionInput = {
                accountId: uuid(),
                planId: uuid(),
            }
            const result = await request(app).put(makeUri(input.accountId, input.planId)).send(input)
            expect(result.status).toEqual(400)
        })
    })

    describe('GET /accounts/{accountId}/subscriptions - ListAccountSubscriptions', () => {
        it('Responds', async () => {
            const accountId = uuid()
            const subscription = await createTestSubscription(accountId)
            const result = await request(app).get(`/accounts/${accountId}/subscriptions`)
            expect(result.status).toEqual(200)
            expect(result.body.subscriptions).toBeDefined()
            const subscriptions = result.body.subscriptions as Subscription[]
            expect(subscriptions).toHaveLength(1)
            expect(subscriptions.find(s => s.accountId === accountId && s.planId === subscription.planId)).toBeDefined()
        })
    })

    describe('GET /plans/{planId}/subscriptions - ListPlanSubscriptions', () => {
        it('Responds', async () => {
            const accountId = uuid()
            const subscription = await createTestSubscription(accountId)
            const planId = subscription.planId
            const result = await request(app).get(`/plans/${planId}/subscriptions`)
            expect(result.status).toEqual(200)
            expect(result.body.subscriptions).toBeDefined()
            const subscriptions = result.body.subscriptions as Subscription[]
            expect(subscriptions).toHaveLength(1)
            expect(subscriptions.find(s => s.accountId === accountId && s.planId === planId)).toBeDefined()
        })
    })

    describe('GET /accounts/{accountId}/subscriptions/{planId} - GetSubscription', () => {
        const makeUri = (accountId: string, planId: string) => `/accounts/${accountId}/subscriptions/${planId}`

        it('Gets a subscription', async () => {
            const accountId = uuid()
            const subscription = await createTestSubscription(accountId)

            const response = await request(app).get(makeUri(accountId, subscription.planId))
            expect(response.status).toEqual(200)
            expect(response.body.subscription).toBeDefined()
            const s = response.body.subscription as Subscription
            expect(s.accountId).toEqual(accountId)
            expect(s.planId).toEqual(subscription.planId)
        })

        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(makeUri(uuid(), uuid()))
            expect(response.status).toEqual(404)
        })
    })

    describe('DELETE /accounts/{accountId}/subscriptions/{planId} - DeleteSubscription', () => {
        it('Deletes a subscription', async () => {
            const {accountId, planId} = await createTestSubscription(uuid())
            const response = await request(app).delete(`/accounts/${accountId}/subscriptions/${planId}`)
            expect(response.status).toEqual(200)
            expect(response.body.accountId).toEqual(accountId)
            expect(response.body.planId).toEqual(planId)
            const dbSubscription = await subscriptionDao.getSubscription({accountId, planId})
            expect(dbSubscription).toBeNull()
        })

        it('Gracefully responds on non-existent subscription', async () => {
            const response = await request(app).delete(`/accounts/${uuid()}/subscriptions/${uuid()}`)
            expect(response.status).toEqual(204)
        })
    })

})
