import {Express} from 'express'
import {BadInputError, NotFoundError} from '../exceptions'
import {errorResponse} from './util'
import {ProductDao} from '../persistence/product-dao'
import {CreatePlanInput, ModifyPlanInput} from '../models/plan'
import PlanDao from '../persistence/plan-dao'

const VALID_CURRENCIES = ['CAD', 'USD', 'MXN']

/**
 * @throws BadInputError
 */
async function validateCreatePlan(productDao: ProductDao, input: any): Promise<CreatePlanInput> {
    const errors = []
    if (!input.name) {
        errors.push(`Required field 'name' is missing`)
    }
    if (!input.productId) {
        errors.push(`Required field 'productId' is missing`)
    }
    if (!input.currency) {
        errors.push(`Required field 'currency' is missing`)
    }
    if (!VALID_CURRENCIES.includes(input.currency)) {
        errors.push(`Currency must be one of (${VALID_CURRENCIES.join(', ')})`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    const product = await productDao.getProduct(input.productId)
    if (!product) {
        errors.push(`Invalid productId '${input.productId}'`)
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }
    return input as CreatePlanInput
}

/**
 * @throws BadInputError
 */
async function validateModifyPlan(input: any): Promise<ModifyPlanInput> {
    const errors = []
    if (!input.planId) {
        errors.push('A planId is required')
    }
    if (input.hasOwnProperty('currency') && !VALID_CURRENCIES.includes(input.currency)) {
        errors.push(`Currency must be one of (${VALID_CURRENCIES.join(', ')})`)
    }
    if (input.name?.length > 127) {
        errors.push(`Field 'name' must be shorter than 128 characters`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }
    return input as ModifyPlanInput
}

function validateDateInput(input?: any): Date|undefined {
    if (!input) {
        return undefined
    }
    // 2017-09-22
    if (typeof input === 'string' && input.match(/^\d{4}-([0]\d|1[0-2])-([0-2]\d|3[01])$/)) {
        return new Date(input)
    }
    throw new BadInputError(['EffectiveDate must be in the format YYYY-MM-DD'])
}

export default function PlansController(app: Express, plans: PlanDao, products: ProductDao) {
    app.get('/plans/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter planId is missing']))
        }
        plans.getPlan(req.params.id)
            .then(plan => {
                if (!plan) {
                    throw new NotFoundError()
                }
                res.send({plan})
            })
            .catch(errorResponse(res))
    })

    app.get('/plans', (req, res) => {
        const {productId, currency} = (req.query as any)
        const effectiveDate = validateDateInput(req.query.effectiveDate)
        plans.listPlans(productId, currency, effectiveDate)
            .then(plans => res.send({plans}))
            .catch(errorResponse(res))
    })

    app.post('/plans', (req, res) => {
        if (!req.body) {
            return errorResponse(res)(new BadInputError(['No input received']))
        }
        validateCreatePlan(products, req.body)
            .then(input => plans.createPlan(input))
            .then(plan => res.send({plan}))
            .catch(errorResponse(res))
    })

    app.patch('/plans/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter planId is missing']))
        }
        if (!req.body) {
            return errorResponse(res)(new BadInputError(['No input received']))
        }
        validateModifyPlan({ ...req.body, planId: req.params.id })
            .then(input => plans.updatePlan(input))
            .then(plan => res.send({plan}))
            .catch(errorResponse(res))
    })

    app.delete('/plans/:id', (req, res) => {
        if (!req.params.id) {
            return errorResponse(res)(new BadInputError(['Parameter planId is missing']))
        }
        plans.deletePlan(req.params.id)
            .then(p => {
                if (!p) {
                    res.status(204).send()
                    return
                }
                res.status(200).send({planId: req.params.id})
            })
            .catch(errorResponse(res))
    })
}
