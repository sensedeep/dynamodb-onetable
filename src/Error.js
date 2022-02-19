/*
    OneTable error class
 */

function init(self, message, context) {
    self.name = self.constructor.name
    self.message = message
    if (context) {
        self.context = context
        let code = context.code || context.name
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
        self.stack = (new Error(message)).stack
    }
}

export class OneTableError extends Error {
    constructor(message, context = {}) {
        super(message)
        init(this, message, context)
    }

    toString() {
        let buf = [`message: ${this.message}`]
        if (this.context.code) {
            buf.push(`code: ${this.code}`)
        }
        if (this.context) {
            buf.push(`context: ${JSON.stringify(this.context, null, 4)}`)
        }
        return buf.join('\n')
    }
}

export class OneTableArgError extends Error {
    constructor(message, context = {}) {
        super(message, context)
        init(this, message, context)
        this.code = context.code || 'ArgumentError'
    }
}
