export class OneError extends Error {
    constructor(message: any, context: any);
    context: any;
    code?: string;
}

export class OneArgError extends Error {
    constructor(message: any, context?: any);
    code: any;
}
