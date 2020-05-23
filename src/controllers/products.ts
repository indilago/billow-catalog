import {Express} from 'express'
import {ResourceDao} from '../persistence/resource-dao'
import {BadInputError, NotFoundError} from '../exceptions'
import {errorResponse, filterFields} from './util'
import {CreateProductInput, Entitlement, ModifyProductInput, Product} from '../models/product'
import {ProductDao} from '../persistence/product-dao'

/**
 * Validates the given entitlements
 * @return list of errors found (empty array if no errors)
 */
async function validateEntitlements(resourceDao: ResourceDao, entitlements: {[resourceId: string]: Entitlement}): Promise<string[]> {
    const resources = (await resourceDao.listResources())
        .reduce<Set<string>>((resourceSet, resource) => {
            resourceSet.add(resource.resourceId)
            return resourceSet
        }, new Set([]))
    const errors: string[] = []
    for (const resourceId in entitlements) {
        if (!entitlements.hasOwnProperty(resourceId)) {
            continue
        }
        if (!resources.has(resourceId)) {
            errors.push(`Invalid resourceId '${resourceId}' in entitlements`)
        }
    }
    return errors
}

/**
 * @throws BadInputError
 */
async function validateCreateProduct(resourceDao: ResourceDao, input: any): Promise<CreateProductInput> {
    const errors = []
    if (!input.name) {
        errors.push(`Required field 'name' is missing`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    if (input.entitlements) {
        errors.push(...(await validateEntitlements(resourceDao, input.entitlements)))
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }
    const validFields: (keyof CreateProductInput)[] =
        ['name', 'description', 'entitlements', 'stripeProductId']
    return filterFields<CreateProductInput>(validFields, input)
}

/**
 * @throws BadInputError
 */
async function validateModifyProduct(resourceDao: ResourceDao, input: any): Promise<ModifyProductInput> {
    const errors = []
    if (!input.productId) {
        errors.push('A productId is required')
    }
    if (input.name?.length > 127) {
        errors.push(`Field 'name' must be shorter than 128 characters`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    if (input.stripeProductId?.length > 127) {
        errors.push(`Field 'stripeProductId' must be shorter than 128 characters`)
    }
    if (input.entitlements) {
        errors.push(...(await validateEntitlements(resourceDao, input.entitlements)))
    }
    if (input.addEntitlements) {
        errors.push(...(await validateEntitlements(resourceDao, input.addEntitlements)))
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }
    const validFields: (keyof ModifyProductInput)[] =
        ['productId', 'name', 'description', 'stripeProductId', 'entitlements', 'addEntitlements', 'removeEntitlements']
    return filterFields<ModifyProductInput>(validFields, input)
}

function mapToObject(map?: Map<string, any>) {
    if (!map) {
        return {}
    }
    const m: any = {}
    map.forEach((value, key) => m[key] = value)
    return m
}

/**
 * Marshall a Product to a json-friendly object
 */
function marshallProduct(product: Product): any {
    const p = { ...product }
    p.entitlements = mapToObject(product.entitlements)
    return p
}
function marshallProducts(products: Product[]): any {
    return products.map(marshallProduct)
}

export default function ProductsController(app: Express, products: ProductDao, resources: ResourceDao) {
    app.get('/products/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter productId is missing']))
        }
        products.getProduct(req.params.id)
            .then(product => {
                if (!product) {
                    throw new NotFoundError()
                }
                res.send({product: marshallProduct(product)})
            })
            .catch(errorResponse(res))
    })

    app.get('/products', (req, res) => {
        products.listProducts()
            .then(products => res.send({products: marshallProducts(products)}))
            .catch(errorResponse(res))
    })

    app.post('/products', (req, res) => {
        if (!req.body) {
            return errorResponse(res)(new BadInputError(['No input received']))
        }
        validateCreateProduct(resources, req.body)
            .then(input => products.createProduct(input))
            .then(product => res.send({product: marshallProduct(product)}))
            .catch(errorResponse(res))
    })

    app.patch('/products/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter productId is missing']))
        }
        if (!req.body) {
            return errorResponse(res)(new BadInputError(['No input received']))
        }
        validateModifyProduct(resources, { ...req.body, productId: req.params.id })
            .then(input => products.updateProduct(input))
            .then(product => res.send({product: marshallProduct(product)}))
            .catch(errorResponse(res))
    })

    app.delete('/products/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter productId is missing']))
        }
        products.deleteProduct(req.params.id)
            .then(p => {
                if (!p) {
                    res.status(204).send()
                    return
                }
                res.status(200).send({productId:req.params.id})
            })
            .catch(errorResponse(res))
    })
}
