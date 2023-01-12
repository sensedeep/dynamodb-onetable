export class OneTableError extends Error {
    constructor(message: any, context: any)
    context: any
    code?: string
}

export class OneTableArgError extends Error {
    constructor(message: any, context?: any)
    code: any
}
