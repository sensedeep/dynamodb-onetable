/*
    OneTable error class
 */
export interface ErrorContext extends Record<string, unknown> {
    code?: string,
    name?: string
}

function init(self, message: string, context: ErrorContext) {
    self.name = self.constructor.name
    self.message = message
    if (context) {
        self.context = context
        const code = context.code || context.name
        if (code) {
            self.code = code
            delete context.code
            delete context.name
        }
    }
    self.date = new Date()
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(self, self.constructor)
    } else {
        self.stack = new Error(message).stack
    }
}


export class OneTableError extends Error {
    context: ErrorContext
    code?: string

    constructor(message: string, context: ErrorContext = {}) {
        super(message)
        init(this, message, context)
    }

    toString() {
        const buf = [`message: ${this.message}`]
        if (this.context.code) {
            buf.push(`code: ${this.code}`)
        }
        if (this.context) {
            try {
                buf.push(`context: ${JSON.stringify(this.context, null, 4)}`)
            } catch (err) {
                //  Incase context has loops in some objects. Try to handle the properties that don't have loops.
                buf.push('{')
                for (const [key, value] of Object.entries(this.context)) {
                    try {
                        buf.push(`    ${key}: ${JSON.stringify(value, null, 4)}`)
                    } catch (err) {
                        //  No action
                    }
                }
                buf.push('}')
            }
        }
        return buf.join('\n')
    }
}

export class OneTableArgError extends Error {
    context: ErrorContext
    code: string

    constructor(message: string, context: ErrorContext = {}) {
        super(message)
        init(this, message, context)
        this.code = context.code || 'ArgumentError'
    }
}
