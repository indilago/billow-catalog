/**
 * BadInputError
 */
export class BadInputError extends Error {
    constructor(readonly errors: string[]) {
        super('Invalid input')
    }
}
BadInputError.prototype.name = 'BadInputError'
export const isBadInputError = (arg: any): arg is BadInputError => arg?.name === BadInputError.prototype.name

/**
 * NotFoundError
 */
export class NotFoundError extends Error {
    constructor(readonly cause?: Error) {
        super('Resource not found')
    }
}
NotFoundError.prototype.name = 'NotFoundError'
export const isNotFoundError = (arg: any): arg is NotFoundError => arg?.name === NotFoundError.prototype.name
