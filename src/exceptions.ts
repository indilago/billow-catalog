abstract class BillowError extends Error {
    readonly _errorClass = 'BillowError'
    protected constructor(readonly code: string,
                readonly httpStatus: number,
                readonly message: string,
                readonly cause?: Error) {
        super(message);
    }
}
export const isBillowError = (arg: any): arg is BillowError =>
    arg?._errorClass === 'BillowError'

/**
 * BadInputError
 */
export class BadInputError extends BillowError {
    constructor(readonly errors: string[]) {
        super('BadInputError', 400, 'Bad input')
    }
}
export const isBadInputError = (arg: any): arg is BadInputError =>
    arg?.code === 'BadInputError'

/**
 * NotFoundError
 */
export class NotFoundError extends BillowError {
    constructor(readonly cause?: Error) {
        super('NotFoundError', 404, 'Resource not found', cause)
    }
}
export const isNotFoundError = (arg: any): arg is NotFoundError =>
    arg?.code === 'NotFoundError'

/**
 * ResourceConflictError
 */
export class ResourceConflictError extends BillowError {
    constructor(readonly resource?: any) {
        super('ResourceConflictError', 419, 'Resource already exists')
    }
}
export const isResourceConflictError = (arg: any): arg is ResourceConflictError =>
    arg?.code === 'ResourceConflictError'
