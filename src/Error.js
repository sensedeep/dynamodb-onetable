/*
    OneTable error class
 */

function init(self, message, context) {
    self.name = self.constructor.name
    self.message = message
    if (context) {
        self.context = context
        if (context.code) {
            self.code = `${context.code}Error`
            delete context.code
        }
    }
    self.date = new Date()
    if (typeof Error.captureStackTrace === 'function') {
        Error.captureStackTrace(self, self.constructor)
    } else {
        self.stack = (new Error(message)).stack
    }
}

export class OneError extends Error {
    constructor(message, context) {
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
        if (this.stack) {
            buf.push(`stack: ${this.stack}`)
        }
        return buf.join('\n')
    }
}

export class OneArgError extends Error {
    constructor(message, context) {
        super(message, context)
        init(this, message, context)
        this.code = context ? context.code : 'Arg'
    }
}
