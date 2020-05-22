import {Response} from 'express'
import {isBadInputError, isNotFoundError} from '../exceptions'

export const errorResponse = (response: Response) => (error: Error) => {
    if (isBadInputError(error)) {
        if (process.env.NODE_ENV !== 'test') {
            console.log('Input error', error)
        }
        return response.status(400).send({errors: error.errors})
    }
    if (isNotFoundError(error)) {
        return response.status(404).send({error: error.message})
    }
    console.error('Unexpected error', error)
    response.status(500).send({error: error.message})
}
