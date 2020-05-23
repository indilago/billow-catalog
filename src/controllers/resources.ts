import {Express} from 'express'
import {ResourceDao} from '../persistence/resource-dao'
import {CreateResourceInput, ModifyResourceInput} from '../models/resource'
import {BadInputError, NotFoundError} from '../exceptions'
import {errorResponse, filterFields} from './util'

/**
 * @throws BadInputError
 */
async function validateCreateResource(input: any): Promise<CreateResourceInput> {
    const errors = []
    if (!input.name) {
        errors.push(`Required field 'name' is missing`)
    }
    if (input.defaultValue !== 0 && !input.defaultValue) {
        errors.push(`Required field 'defaultValue' is missing`)
    }
    if (!input.meteringType) {
        errors.push(`Required field 'meteringType' is missing`)
    }
    if (input.resourceId?.length > 127) {
        errors.push(`Field 'resourceId' must be shorter than 128 characters`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    const validMeteringTypes = ['boolean', 'maximum']
    if (!validMeteringTypes.includes(input.meteringType)) {
        errors.push(`Field 'meteringType' must be one of (${validMeteringTypes.join(', ')})`)
    }
    if (!Number.isInteger(parseInt(input.defaultValue, 10))) {
        errors.push(`Field 'defaultValue' must be an integer`)
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }
    const validFields: (keyof CreateResourceInput)[] =
        ['resourceId', 'name', 'description', 'meteringType', 'defaultValue']
    return filterFields<CreateResourceInput>(validFields, input)
}

/**
 * @throws BadInputError
 */
async function validateModifyResource(input: any): Promise<ModifyResourceInput> {
    const errors = []
    if (!input.resourceId) {
        errors.push('A resourceId is required')
    }
    if (input.resourceId?.length > 127) {
        errors.push(`Field 'resourceId' must be shorter than 128 characters`)
    }
    if (input.description?.length > 127) {
        errors.push(`Field 'description' must be shorter than 128 characters`)
    }
    const validMeteringTypes = ['boolean', 'maximum']
    if (input.meteringType && !validMeteringTypes.includes(input.meteringType)) {
        errors.push(`Field 'meteringType' must be one of (${validMeteringTypes.join(', ')})`)
    }
    if (input.hasOwnProperty('defaultValue') && !Number.isInteger(parseInt(input.defaultValue, 10))) {
        errors.push(`Field 'defaultValue' must be an integer`)
    }
    if (errors.length) {
        throw new BadInputError(errors)
    }

    const validFields: (keyof ModifyResourceInput)[] =
        ['resourceId', 'name', 'description', 'meteringType', 'defaultValue']
    return filterFields<ModifyResourceInput>(validFields, input)
}

export default function ResourcesController(app: Express, resources: ResourceDao) {
    app.get('/resources/:id', (req, res) => {
        if (!req.params.id) {
            errorResponse(res)(new BadInputError(['Parameter resourceId is missing']))
        }
        resources.getResource(req.params.id)
            .then(resource => {
                if (!resource) {
                    throw new NotFoundError()
                }
                res.send({resource})
            })
            .catch(errorResponse(res))
    })

    app.get('/resources', (req, res) => {
        resources.listResources()
            .then(resources => res.send({resources}))
            .catch(errorResponse(res))
    })

    app.patch('/resources/:id', (req, res) => {
        if (!req.params.id) {
            errorResponse(res)(new BadInputError(['Parameter resourceId is missing']))
        }
        if (!req.body) {
            errorResponse(res)(new BadInputError(['No input received']))
        }
        return validateModifyResource(req.body)
            .then(input => {
                return resources.getResource(req.params.id)
                    .then(existingItem => {
                        if (!existingItem) {
                            throw new NotFoundError()
                        }
                        return resources.updateResource({...input, resourceId: existingItem.resourceId})

                    })
                    .then(resource => res.send({resource}))

            })
            .catch(errorResponse(res))

    })
    app.put('/resources', (req, res) => {
        if (!req.body) {
            errorResponse(res)(new BadInputError(['No input received']))
        }
        (req.body.resourceId ? resources.getResource(req.body.resourceId) : Promise.resolve(null))
            .then(existingItem => {
                if (existingItem) {
                    return validateModifyResource(req.body)
                        .then(input => {
                            return resources.updateResource({...input, resourceId: existingItem.resourceId})
                        })
                } else {
                    return validateCreateResource(req.body)
                        .then(input => resources.createResource(input))
                }
            })
            .then(resource => res.send({resource}))
            .catch(errorResponse(res))
    })

    app.delete('/resources/:id', (req, res) => {
        if (!req.params.id) {
            errorResponse(res)(new BadInputError(['Parameter resourceId is missing']))
        }
        resources.deleteResource(req.params.id)
            .then(r => {
                if (!r) {
                    res.status(204).send()
                    return
                }
                res.status(200).send({resourceId: req.params.id})
            })
            .catch(errorResponse(res))
    })
}
