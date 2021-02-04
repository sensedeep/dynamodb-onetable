/*
    Table.js - DynamoDB table class
 */

import Crypto from 'crypto'
import Model from './Model.js'

const IV_LENGTH = 16

/*
    Item schema to create uniqueness records. Implements unique fields.
 */
const UniqueSchema = {
    pk: { value: '_unique:${pk}' },
    sk: { value: '_unique:' },
}

/*
    Schema for the low level API
 */
const LowLevelSchema = {
    pk: { },
    sk: { },
}

/*
    Represent a single DynamoDB table
 */
export default class Table {

    constructor(params = {}) {
        let {
            client,         //  Instance of DocumentClient.
            createdField,   //  Name of "created" timestamp attribute.
            crypto,         //  Crypto configuration. {primary: {cipher: 'aes-256-gcm', password}}.
            delimiter,      //  Composite sort key delimiter (default ':').
            logger,         //  Logging function(tag, message, properties). Tag is data.info|error|trace|exception.
            hidden,         //  Hide key attributes in Javascript properties. Default false.
            migrate,        //  Migration function(model, operation, data). Operation: 'create', 'delete', 'put', ...
            name,           //  Table name.
            nulls,          //  Store nulls in database attributes. Default false.
            schema,         //  Table models schema.
            timestamps,     //  Make "created" and "updated" timestamps. Default true.
            typeField,      //  Name of model type attribute. Default "_type".
            updatedField,   //  Name of "updated" timestamp attribute.
            uuid            //  Function to create a UUID if field schema requires it.
        } = params

        this.logger = logger
        this.log('trace', `Loading DDB`, {params})

        this.params = params
        this.client = client
        this.migrate = migrate
        this.nulls = nulls || false
        this.delimiter = delimiter || '#'
        this.createdField = createdField || 'created'
        this.updatedField = updatedField || 'updated'
        this.typeField = typeField || '_type'
        this.name = name
        this.timestamps = timestamps || true
        this.uuid = uuid || this.uuid
        this.hidden = hidden || false

        //  Schema models
        this.models = {}

        //  Context properties always applied to create/updates
        this.context = {}

        //  Model for uunique properties and for genric access
        this.unique = new Model(this, '_Unique', {fields: UniqueSchema, timestamps: false})
        this.generic = new Model(this, '_Multi', {fields: LowLevelSchema, timestamps: false})

        if (schema) {
            this.prepSchema(schema)
        }
        if (crypto) {
            this.initCrypto(crypto)
            this.crypto = Object.assign(crypto || {})
            for (let [name, crypto] of Object.entries(this.crypto)) {
                crypto.secret = Crypto.createHash('sha256').update(crypto.password, 'utf8').digest()
                this.crypto[name] = crypto
                this.crypto[name].name = name
            }
        }
    }

    prepSchema(params) {
        let {models, indexes} = params
        let migrate = params.migrate || this.migrate
        for (let [name, fields] of Object.entries(models)) {
            this.models[name] = new Model(this, name, {fields, indexes, migrate})
        }
    }

    listModels() {
        return Object.keys(this.models)
    }

    addModel(name, fields, migrate) {
        this.models[name] = new Model(this, name, {indexes: schema.indexes, fields, migrate})
    }

    /*
        Thows exception if model cannot be found
     */
    getModel(name) {
        if (typeof name != 'string') {
            throw new Error(`Bad argument type for model name ${name}`)
        }
        let model = this.models[name]
        if (!model) {
            throw new Error(`Cannot find model ${model}`)
        }
        return model
    }

    removeModel(name) {
        delete this.models[name]
    }

    /*
        Set or update the context object. Return this for chaining.
     */
    setContext(context = {}, merge = false) {
        this.context = merge ? Object.assign(this.context, context) : context
        return this
    }

    /*
        Clear the context
     */
    clear() {
        this.context = {}
        return this
    }

    //  High level API

    async create(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.create(properties, params)
    }

    async find(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.find(properties, params)
    }

    async get(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.get(properties, params)
    }

    async remove(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.remove(properties, params)
    }

    async scan(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.scan(properties, params)
    }

    async update(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.update(properties, params)
    }

    //  Low level API

    async batchGet(batch, params = {}) {
        let result
        try {
            this.log('trace', `Dynamo batchGet on "${this.name}"`, {batch}, params)
            result = await this.client.batchGet(batch).promise()
        } catch (err) {
            this.log('info', `BatchGet error`, {message: err.message, batch})
            throw err
        }
        return result
    }

    async batchWrite(batch, params = {}) {
        let result
        try {
            this.log('trace', `Dynamo batchWrite on "${this.name}"`, {batch}, params)
            result = await this.client.batchWrite(batch).promise()
        } catch (err) {
            this.log('info', `BatchWrite error`, {message: err.message, batch})
            throw err
        }
        return result
    }

    async deleteItem(properties, params) {
        return await this.generic.deleteItem(properties, params)
    }

    async getItem(properties, params) {
        return await this.generic.getItem(properties, params)
    }

    async putItem(properties, params) {
        return await this.generic.putItem(properties, params)
    }

    async queryItems(properties, params) {
        return await this.generic.queryItems(properties, params)
    }

    async scanItems(properties, params) {
        return await this.generic.scanItems(properties, params)
    }

    async updateItem(properties, params) {
        return await this.generic.updateItem(properties, params)
    }

    /*
        Invoke a prepared transaction
     */
    async transact(op, transaction, params = {}) {
        let result
        try {
            this.log('trace', `Dynamo "${op}" transaction on "${this.name}"`, {transaction, op}, params)
            if (op == 'write') {
                result = await this.client.transactWrite(transaction).promise()
            } else {
                result = await this.client.transactGet(transaction).promise()
            }
        } catch (err) {
            this.log('info', `Transaction error`, {message: err.message, transaction})
            throw err
        }
        return result
    }

    log(type, message, context, params) {
        if (this.logger) {
            if (params && params.log) {
                this.logger.info(message, context)
            } else {
                this.logger[type](message, context)
            }
        }
    }

    // Simple non-crypto UUID. See node-uuid if you require crypto UUIDs.
    uuid() {
        return 'xxxxxxxxxxxxxxxxyxxxxxxxxxyxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        })
    }

    initCrypto(crypto) {
        this.crypto = Object.assign(crypto || {})
        for (let [name, crypto] of Object.entries(this.crypto)) {
            crypto.secret = Crypto.createHash('sha256').update(crypto.password, 'utf8').digest()
            this.crypto[name] = crypto
            this.crypto[name].name = name
        }
    }

    encrypt(text, name = 'primary', inCode = 'utf8', outCode = 'base64') {
        if (text) {
            if (!this.crypto) {
                throw new Error('dynamo: No database secret or cipher defined')
            }
            let crypto = this.crypto[name]
            if (!crypto) {
                throw new Error(`dynamo: Database crypto not defined for ${name}`)
            }
            let iv = Crypto.randomBytes(IV_LENGTH)
            let crypt = Crypto.createCipheriv(crypto.cipher, crypto.secret, iv)
            let crypted = crypt.update(text, inCode, outCode) + crypt.final(outCode)
            let tag = (crypto.cipher.indexOf('-gcm') > 0) ? crypt.getAuthTag().toString(outCode) : ''
            text = `${crypto.name}:${tag}:${iv.toString('hex')}:${crypted}`
        }
        return text
    }

    decrypt(text, inCode = 'base64', outCode = 'utf8') {
        if (text) {
            let [name, tag, iv, data] = text.split(':')
            if (!data || !iv || !tag || !name) {
                return text
            }
            if (!this.crypto) {
                throw new Error('dynamo: No database secret or cipher defined')
            }
            let crypto = this.crypto[name]
            if (!crypto) {
                throw new Error(`dynamo: Database crypto not defined for ${name}`)
            }
            iv = Buffer.from(iv, 'hex')
            let crypt = Crypto.createDecipheriv(crypto.cipher, crypto.secret, iv)
            crypt.setAuthTag(Buffer.from(tag, inCode))
            text = crypt.update(data, inCode, outCode) + crypt.final(outCode)
        }
        return text
    }
}
