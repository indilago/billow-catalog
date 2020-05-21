import app, {productDao, resourceDao} from '../app'
import request from 'supertest'
import {v4 as uuid} from 'uuid'
import {CreateResourceInput} from '../models/resource'
import {CreateProductInput, ModifyProductInput, Product} from '../models/product'

const createdProductIds: string[] = []
const createdResourceIds: string[] = []
const createTestResource = async (name: string) => {
    const input: CreateResourceInput = {
        name: `test-${name}`,
        description: 'test',
        meteringType: 'boolean',
        defaultValue: 0,
    }
    const {resourceId} = await resourceDao.createResource(input)
    createdResourceIds.push(resourceId)
    return {...input, resourceId}
}
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

describe('Products', () => {
    afterAll(async () => {
        await Promise.all([
            Promise.all(createdResourceIds.map(resourceId => resourceDao.deleteResource(resourceId))),
            Promise.all(createdProductIds.map(productId => productDao.deleteProduct(productId))),
        ])
    })

    describe('POST /products - CreateProduct', () => {
        it('Creates a new product', async () => {
            const {resourceId} = await createTestResource('foo')
            const input: CreateProductInput = {
                name: 'test-create',
                entitlements: {
                    [resourceId]: {value: 3, cumulative: false},
                },
            }
            const result = await request(app).post('/products').send(input)
            expect(result.status).toEqual(200)
            expect(result.body).toHaveProperty('product')
            expect(result.body.product.productId).toBeTruthy()
            createdProductIds.push(result.body.productId)
        })
        it('Throws 400 for bad resourceIds', async () => {
            const input: CreateProductInput = {
                name: 'test-create-400',
                entitlements: {
                    [uuid()]: {value: 3, cumulative: false},
                },
            }
            const result = await request(app).post('/products').send(input)
            expect(result.status).toEqual(400)
        })

    })

    describe('PATCH /products/{productId} - ModifyProduct', () => {
        it('Updates an existing product', async () => {
            const {productId} = await createTestProduct('update')
            const input: ModifyProductInput = {
                productId,
                name: 'foo-test-2',
            }
            const res = await request(app).patch(`/products/${productId}`).send(input)
            expect(res.status).toEqual(200)
            expect(res.body.product).toBeDefined()
            expect(res.body.product.productId).toEqual(productId)
            expect(res.body.product.name).toEqual(input.name)
            const product = await productDao.getProduct(productId)
            expect(product.name).toEqual(input.name)
        })
        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(`/products/${uuid()}`)
            expect(response.status).toEqual(404)
        })
    })

    describe('GET /products - ListProducts', () => {
        it('Responds', async () => {
            const {productId} = await createTestProduct('update')
            const result = await request(app).get('/products')
            expect(result.status).toEqual(200)
            expect(result.body).toHaveProperty('products')
            expect(Array.isArray(result.body.products)).toBe(true)
            const products = result.body.products as Product[]
            expect(products.find(r => r.productId === productId)).toBeDefined()
        })
    })

    describe('GET /products/{productId} - GetProduct', () => {
        it('Gets a product', async () => {
            const {productId, ...product} = await createTestProduct('get')

            const response = await request(app).get(`/products/${productId}`)
            expect(response.status).toEqual(200)
            expect(response.body).toHaveProperty('product')
            const p = (response.body.product as Product)
            expect(p.productId).toEqual(productId)
            expect(p.name).toEqual(product.name)
            expect(p.description).toEqual(product.description)
        })

        it('Throws a 404 when nonexistent', async () => {
            const response = await request(app).get(`/products/${uuid()}`)
            expect(response.status).toEqual(404)
        })
    })

    describe('DELETE /products/{productId} - DeleteProduct', () => {
        it('Deletes a product', async () => {
            const {productId, ...product} = await createTestProduct('delete')

            const response = await request(app).delete(`/products/${productId}`)
            expect(response.status).toEqual(200)
            expect(response.body.productId).toEqual(productId)
        })

        it('Gracefully responds on non-existent product', async () => {
            const response = await request(app).delete(`/products/${uuid()}`)
            expect(response.status).toEqual(204)
        })
    })

})
