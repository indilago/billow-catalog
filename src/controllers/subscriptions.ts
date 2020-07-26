import {Express} from 'express'
import {BadInputError, NotFoundError} from '../exceptions'
import {errorResponse, filterFields} from './util'
import PlanDao from '../persistence/plan-dao'
import SubscriptionDao, {PutSubscriptionInput} from '../persistence/subscription-dao'
import {Subscription} from '../models/subscription'

/**
 * @throws BadInputError
 */
async function validatePutSubscription(planDao: PlanDao, input: any): Promise<PutSubscriptionInput> {
    const errors = []
    if (!input.accountId) {
        errors.push(`Required field 'accountId' is missing`)
    }
    if (!input.planId) {
        errors.push(`Required field 'planId' is missing`)
    }
    if (input.hasOwnProperty('expiresAt')) {
        try {
            input.expiresAt = new Date(input.expiresAt)
        } catch (e) {
            errors.push('ExpiresAt must be in ISO 8601 format')
        }
    }
    const plan = await planDao.getPlan(input.planId)
    if (!plan) {
        errors.push(`Invalid planId '${input.planId}'`)
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }

    const validFields: (keyof PutSubscriptionInput)[] = ['accountId', 'planId', 'expiresAt', 'stripeSubscriptionId']
    return filterFields<PutSubscriptionInput>(validFields, input)
}

function listSubscriptions(subscriptions: SubscriptionDao,
                           planId?: string,
                           accountId?: string,
                           limitInput?: string): Promise<Subscription[]> {
    const limit = limitInput ? parseInt(limitInput, 10) : undefined
    if (planId) {
        return subscriptions.listSubscriptionsByPlan({planId, limit})
    } else if (accountId) {
        return subscriptions.listSubscriptionsByAccount({accountId, limit})
    }
    throw new BadInputError([`Either 'planId' or 'accountId' is required`])
}


export default function SubscriptionsController(app: Express, subscriptions: SubscriptionDao, plans: PlanDao) {

    app.get('/subscriptions', (req, res) => {
        const {planId, accountId, limit} = (req.query as any)
        listSubscriptions(subscriptions, planId, accountId, limit)
            .then(results => res.send({subscriptions: results}))
            .catch(errorResponse(res))
    })

    app.get('/accounts/:accountId/subscriptions', (req, res) => {
        const {accountId, limit} = req.params
        listSubscriptions(subscriptions, null, accountId, limit)
            .then(results => res.send({subscriptions: results}))
            .catch(errorResponse(res))
    })

    app.get('/plans/:planId/subscriptions', (req, res) => {
        const {planId, limit} = req.params
        listSubscriptions(subscriptions, planId, null, limit)
            .then(results => res.send({subscriptions: results}))
            .catch(errorResponse(res))
    })

    app.get('/accounts/:accountId/subscriptions/:planId', (req, res) => {
        const { accountId, planId } = req.params
        if (!accountId || !planId) {
            return errorResponse(res)(new BadInputError(['Parameters accountId and planId are required']))
        }
        subscriptions.getSubscription({ accountId, planId })
            .then(subscription => {
                if (!subscription) {
                    throw new NotFoundError()
                }
                res.send({subscription})
            })
            .catch(errorResponse(res))
    })

    app.put('/accounts/:accountId/subscriptions/:planId', (req, res) => {
        if (!req.body) {
            return errorResponse(res)(new BadInputError(['No input received']))
        }
        const { accountId, planId } = req.params
        if (!accountId || !planId) {
            return errorResponse(res)(new BadInputError(['Parameters accountId and planId are required']))
        }
        validatePutSubscription(plans, { ...req.body, accountId, planId })
            .then(input => subscriptions.putSubscription(input))
            .then(subscription => res.send({subscription}))
            .catch(errorResponse(res))
    })

    app.delete('/accounts/:accountId/subscriptions/:planId', (req, res) => {
        const { accountId, planId } = req.params
        if (!accountId || !planId) {
            return errorResponse(res)(new BadInputError(['Parameters accountId and planId are required']))
        }
        subscriptions.deleteSubscription({ accountId, planId })
            .then(sub => {
                if (!sub) {
                    res.status(204).send()
                    return
                }
                res.status(200).send({accountId, planId})
            })
            .catch(errorResponse(res))
    })
}
