import {Response} from 'express'
import {isBadInputError, isBillowError, isNotFoundError, isResourceConflictError} from '../exceptions'

export const errorResponse = (response: Response) => (error: Error) => {
    const body: any = {isError: true}
    if (isBillowError(error)) {
        response.status(error.httpStatus)
        Object.assign(body, {code: error.code, message: error.message})
        if (isResourceConflictError(error)) {
            Object.assign(body, {resource: error.resource})
        }
        if (isBadInputError(error)) {
            if (process.env.NODE_ENV !== 'test') {
                console.log('Input error', error)
            }
            Object.assign(body, {inputErrors: error.errors})
        }
        return response.send(body)
    }
    console.error('Unexpected error', error)
    response.status(500).send({...body, message: error.message})
}

export const filterFields = <T> (validFields: (keyof T)[], input: any): T => {
    return validFields.reduce((sanitized, field) => {
        if (input.hasOwnProperty(field)) {
            sanitized[field] = input[field]
        }
        return sanitized
    }, {} as Partial<T>) as T
}
