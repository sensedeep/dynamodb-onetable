/*
    Table.js - DynamoDB table class

    A OneTable Table represents a single (connected) DynamoDB table
 */

import Crypto from 'crypto'
import {Model} from './Model.js'
import UUID from './UUID.js'
import ULID from './ULID.js'

/*
    Safety string required on API to delete a table
*/
const ConfirmRemoveTable = 'DeleteTableForever'

/*
    Crypto IV length
*/
const IV_LENGTH = 16

/*
    Default index keys if not supplied
 */
const DefaultIndexes = {
    primary: {
        hash: 'pk',
        sort: 'sk',
    },
}

const DefaultMetrics = {
    source: 'Default',                  //  Default source name
    max: 20,                            //  Buffer metrics for 20 requests
    period: 10 * 1000,                  //  or buffer for 10 seconds
    namespace: 'OneTable/test-7'        //  Default custom metric namespace
}

/*
    Represent a single DynamoDB table
 */
export class Table {

    constructor(params = {}) {
        let {
            client,         //  Instance of DocumentClient or Dynamo. Use client.V3 to test for Dynamo V3.
            createdField,   //  Name of "created" timestamp attribute.
            crypto,         //  Crypto configuration. {primary: {cipher: 'aes-256-gcm', password}}.
            delimiter,      //  Composite sort key delimiter (default ':').
            generic,        //  Don't restrict properties to the schema. Default false.
            hidden,         //  Hide key attributes in Javascript properties. Default false.
            intercept,      //  Intercept hook function(model, operation, item, params, raw). Operation: 'create', 'delete', 'put', ...
            isoDates,       //  Set to true to store dates as Javascript ISO Date strings.
            logger,         //  Logging function(tag, message, properties). Tag is data.info|error|trace|exception.
            metrics,        //  Enable CloudWatch metrics
            name,           //  Table name.
            nulls,          //  Store nulls in database attributes. Default false.
            schema,         //  Table models schema.
            senselogs,      //  Integrate with SenseLogs as the logger instance
            timestamps,     //  Make "created" and "updated" timestamps. Default false.
            typeField,      //  Name of model type attribute. Default "_type".
            updatedField,   //  Name of "updated" timestamp attribute.
            uuid,           //  Function to create a UUID, ULID, KSUID if field schema requires it.

            /*  LEGACY 1.7.4 - remove in 2.0.0
                Set legacyUnique to the PK separator. Previously was hard coded to ':' without a 'unique' prefix.
                Now, use the delimiter with a unique prefix.
                Defaults to be ':' in 1.7, and false in 1.8.
            */
            legacyUnique,
        } = params

        if (!name) {
            throw new Error('Missing "name" property')
        }
        this.log = senselogs ? senselogs : new Log(logger)
        this.log.trace(`Loading OneTable`)

        if (params.legacyUnique == undefined || params.legacyUnique == true) {
            //  LEGACY 1.7.4 - Revert to false in 1.8
            params.legacyUnique = ':'
        }
        this.params = params
        if (client) {
            this.V3 = client.V3
            this.client = client
            this.service = this.V3 ? client : client.service
        }
        this.createdField = createdField || 'created'
        this.delimiter = delimiter || '#'
        this.generic = generic != null ? generic : false
        this.hidden = hidden != null ? hidden : true
        this.intercept = intercept
        this.isoDates = isoDates || false
        this.name = name
        this.nulls = nulls || false
        this.timestamps = timestamps != null ? timestamps : false
        this.typeField = typeField || '_type'
        this.updatedField = updatedField || 'updated'

        if (params.metrics) {
            if (params.metrics == true) {
                this.metrics = DefaultMetrics
            } else {
                this.metrics = Object.assign(DefaultMetrics, params.metrics)
            }
            this.metrics.count = 0
            this.metrics.lastFlushed = Date.now()
            this.metrics.tree = {}
        }
        this.genericModel = null
        this.uniqueModel = null

        if (uuid == 'uuid') {
            this.makeID = this.uuid
        } else if (uuid == 'ulid') {
            this.makeID = this.ulid
        } else {
            //  Need to have uuid the default so browsers will resolve without node:crypto
            this.makeID = uuid || this.uuid
        }

        //  Schema models
        this.models = {}
        this.indexes = DefaultIndexes

        //  Context properties always applied to create/updates
        this.context = {}

        if (schema) {
            this.schema = schema
            this.prepSchema(schema)
        }

        /*
            Model for unique attributes
         */
        let primary = this.indexes.primary
        let fields = {
            [primary.hash]: { type: String, value: '_unique:${' + primary.hash + '}'},
        }
        if (primary.sort) {
            fields[primary.sort] = { type: String, value: '_unique:'}
        }
        this.uniqueModel = new Model(this, '_Unique', {
            fields: fields,
            indexes: this.indexes,
            timestamps: false
        })

        /*
            Model for genric low-level API access. Generic models allow reading attributes that are not defined on the schema.
         */
        fields = { [primary.hash]: { type: String } }
        if (primary.sort) {
            fields[primary.sort] = { type: String }
        }
        this.genericModel = new Model(this, '_Generic', {
            fields: fields,
            indexes: this.indexes,
            timestamps: false,
            generic: true,
        })

        if (crypto) {
            this.initCrypto(crypto)
            this.crypto = Object.assign(crypto)
            for (let [name, crypto] of Object.entries(this.crypto)) {
                crypto.secret = Crypto.createHash('sha256').update(crypto.password, 'utf8').digest()
                this.crypto[name] = crypto
                this.crypto[name].name = name
            }
        }
    }

    setClient(client) {
        this.client = client
        this.V3 = client.V3
        this.service = this.V3 ? this.client : this.client.service
    }

    /*
        Return the current schema. This may include model schema defined at run-time.
    */
    getSchema() {
        let schema = {name: this.name, models: {}, indexes: this.indexes}
        for (let [name, model] of Object.entries(this.models)) {
            let item = {}
            for (let [field, properties] of Object.entries(model.block.fields)) {
                item[field] = {
                    crypt: properties.crypt,
                    enum: properties.enum,
                    filter: properties.filter,
                    foreign: properties.foreign,
                    hidden: properties.hidden,
                    map: properties.map,
                    name: field,
                    nulls: properties.nulls,
                    required: properties.required,
                    size: properties.size,
                    schema: properties.schema,
                    type: (typeof properties.type == 'function') ? properties.type.name : properties.type,
                    unique: properties.unique,
                    validate: properties.validate ? properties.validate.toString() : null,
                    value: properties.value,

                    //  Computed state
                    attribute: properties.attribute,    //  Attribute 'map' name
                    isIndexed: properties.isIndexed,
                }
            }
            schema.models[name] = item
        }
        return schema
    }

    /*
        Prepare the schema by creating models for all the entities
    */
    prepSchema(params) {
        let {models, indexes} = params
        if (!models) {
            throw new Error('Schema is missing models')
        }
        if (!indexes) {
            throw new Error('Schema is missing indexes')
        }
        this.indexes = indexes
        for (let [name, fields] of Object.entries(models)) {
            this.models[name] = new Model(this, name, {fields, indexes})
        }
    }

    /*
        Create a table. Yes, the actually creates the DynamoDB table.
        Params may contain standard DynamoDB createTable parameters
    */
    async createTable(params = {}) {
        let def = {
            AttributeDefinitions: [],
            KeySchema: [],
            LocalSecondaryIndexes: [],
            GlobalSecondaryIndexes: [],
            TableName: this.name,
        }
        let provisioned = params.ProvisionedThroughput
        if (provisioned) {
            def.ProvisionedThroughput = provisioned
            def.BillingMode = 'PROVISIONED'
        } else {
            def.BillingMode = 'PAY_PER_REQUEST'
        }
        let attributes = {}
        let indexes = this.indexes

        for (let [name, index] of Object.entries(indexes)) {
            let collection, keys
            if (name == 'primary') {
                keys = def.KeySchema
            } else {
                if (index.hash == null || index.hash == indexes.primary.hash) {
                    collection = 'LocalSecondaryIndexes'
                    if (index.project) {
                        throw new Error('Unwanted project for LSI')
                    }
                } else {
                    collection = 'GlobalSecondaryIndexes'
                }
                keys = []
                let project, attributes
                if (Array.isArray(index.project)) {
                    project = 'INCLUDE'
                    attributes = index.project
                } else if (index.project == 'keys') {
                    project = 'KEYS_ONLY'
                } else {
                    project = 'ALL'
                }
                let projDef = {
                    IndexName: name,
                    KeySchema: keys,
                    Projection: {
                        ProjectionType: project,
                    }
                }
                if (attributes) {
                    projDef.Projection.NonKeyAttributes = attributes
                }
                def[collection].push(projDef)
            }
            keys.push({
                AttributeName: index.hash || indexes.primary.hash,
                KeyType: 'HASH',
            })
            if (index.hash && !attributes[index.hash]) {
                def.AttributeDefinitions.push({
                    AttributeName: index.hash,
                    AttributeType: 'S',
                })
                attributes[index.hash] = true
            }
            if (index.sort) {
                if (!attributes[index.sort]) {
                    def.AttributeDefinitions.push({
                        AttributeName: index.sort,
                        AttributeType: 'S',
                    })
                    attributes[index.sort] = true
                }
                keys.push({
                    AttributeName: index.sort,
                    KeyType: 'RANGE',
                })
            }
        }
        if (def.GlobalSecondaryIndexes.length == 0) {
            delete def.GlobalSecondaryIndexes
        } else if (provisioned) {
            for (let index of def.GlobalSecondaryIndexes) {
                index.ProvisionedThroughput = provisioned
            }
        }
        if (def.LocalSecondaryIndexes.length == 0) {
            delete def.LocalSecondaryIndexes
        }
        this.log.trace(`Dynamo createTable for "${this.name}"`, {def})
        if (this.V3) {
            return await this.service.createTable(def)
        } else {
            return await this.service.createTable(def).promise()
        }
    }

    /*
        Delete the DynamoDB table forever. Be careful.
    */
    async deleteTable(confirmation) {
        if (confirmation == ConfirmRemoveTable) {
            this.log.trace(`Dynamo deleteTable for "${this.name}"`)
            if (this.V3) {
                await this.service.deleteTable({TableName: this.name})
            } else {
                await this.service.deleteTable({TableName: this.name}).promise()
            }
        } else {
            throw new Error(`Missing required confirmation "${ConfirmRemoveTable}"`)
        }
    }

    /*
        Return the raw AWS table description
    */
    async describeTable() {
        if (this.V3) {
            return await this.service.describeTable({TableName: this.name})
        } else {
            return await this.service.describeTable({TableName: this.name}).promise()
        }
    }

    /*
        Return true if the underlying DynamoDB table represented by this OneTable instance is present.
    */
    async exists() {
        let results = await this.listTables()
        return results && results.find(t => t == this.name) != null ? true : false
    }

    /*
        Return a list of tables in the AWS region described by the Table instance
    */
    async listTables() {
        let results
        if (this.V3) {
            results = await this.service.listTables({})
        } else {
            results = await this.service.listTables({}).promise()
        }
        return results.TableNames
    }

    listModels() {
        return Object.keys(this.models)
    }

    addModel(name, fields) {
        this.models[name] = new Model(this, name, {indexes: this.indexes, fields})
    }

    getLog() {
        return this.log
    }

    setLog(log) {
        this.log = log
    }

    /*
        Thows exception if model cannot be found
     */
    getModel(name) {
        let model = this.models[name.toString()]
        if (!model) {
            throw new Error(`Cannot find model ${name}`)
        }
        return model
    }

    removeModel(name) {
        let model = this.models[name.toString()]
        if (!model) {
            throw new Error(`Cannot find model ${name}`)
        }
        delete this.models[name.toString()]
    }

    getContext() {
        return this.context
    }

    addContext(context = {}) {
        this.context = Object.assign(this.context, context)
        return this
    }

    setContext(context = {}, merge = false) {
        this.context = merge ? Object.assign(this.context, context) : context
        return this
    }

    clearContext() {
        this.context = {}
        return this
    }

    //  DEPRECATE
    clear() {
        return this.clearContext()
    }

    /*  PROTOTYPE
        Create a clone of the table with the same settings and replace the context
    */
    child(context) {
        let table = Object.clone(this)
        table.context  = context
        return table
    }

    /*
        High level model factory API
        The high level API is similar to the Model API except the model name is provided as the first parameter.
        This API is useful for factories
    */
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

    /*
        The low level API does not use models. It permits the reading / writing of any attribute.
    */
    async batchGet(batch, params = {}) {
        if (Object.getOwnPropertyNames(batch).length == 0) {
            return []
        }
        let result
        try {
            this.log.trace(`Dynamo batchGet on "${this.name}"`, {batch}, params)
            batch.ConsistentRead = params.consistent ? true : false
            if (this.V3) {
                result = await this.client.batchGet(batch)
            } else {
                result = await this.client.batchGet(batch).promise()
            }
            let response = result.Responses
            if (params.parse && response) {
                result = []
                for (let items of Object.values(response)) {
                    for (let item of items) {
                        item = this.unmarshall(item)
                        let type = item[this.typeField] || '_unknown'
                        let model = this.models[type]
                        if (model && model != this.uniqueModel) {
                            result.push(model.transformReadItem('get', item, {}, params))
                        }
                    }
                }
            }

        } catch (err) {
            this.log.error(`BatchGet error`, {message: err.message, batch})
            throw err
        }
        return result
    }

    async batchWrite(batch, params = {}) {
        if (Object.getOwnPropertyNames(batch).length == 0) {
            return {}
        }
        let result
        try {
            this.log.trace(`Dynamo batchWrite on "${this.name}"`, {batch}, params)
            if (this.V3) {
                result = await this.client.batchWrite(batch)
            } else {
                result = await this.client.batchWrite(batch).promise()
            }
        } catch (err) {
            this.log.error(`BatchWrite error`, {message: err.message, batch})
            throw err
        }
        return result
    }

    async deleteItem(properties, params) {
        return await this.genericModel.deleteItem(properties, params)
    }

    async getItem(properties, params) {
        return await this.genericModel.getItem(properties, params)
    }

    async putItem(properties, params) {
        return await this.genericModel.putItem(properties, params)
    }

    async queryItems(properties, params) {
        return await this.genericModel.queryItems(properties, params)
    }

    async scanItems(properties, params) {
        return await this.genericModel.scanItems(properties, params)
    }

    async updateItem(properties, params) {
        return await this.genericModel.updateItem(properties, params)
    }

    async fetch(models, properties, params) {
        return await this.genericModel.fetch(models, properties, params)
    }

    /*
        Invoke a prepared transaction. Note: transactGet does not work on non-primary indexes.
     */
    async transact(op, transaction, params = {}) {
        let result
        try {
            this.log.trace(`Dynamo "${op}" transaction on "${this.name}"`, {transaction, op}, params)
            let promise
            if (op == 'write') {
                promise = this.client.transactWrite(transaction)
            } else {
                promise = this.client.transactGet(transaction)
            }
            if (this.V3) {
                result = await promise
            } else {
                result = await promise.promise()
            }
            if (op == 'get') {
                if (params.parse) {
                    let items = []
                    for (let r of result.Responses) {
                        if (r.Item) {
                            let item = this.unmarshall(r.Item)
                            let type = item[this.typeField] || '_unknown'
                            let model = this.models[type]
                            if (model && model != this.uniqueModel) {
                                items.push(model.transformReadItem('get', item, {}, params))
                            }
                        }
                    }
                    result = items
                }
            }
        } catch (err) {
            if (params.log !== false) {
                this.log.error(`Transaction error`, {message: err.message, transaction})
            }
            throw err
        }
        return result
    }

    /*
        Convert items into a map of items by model type
    */
    groupByType(items) {
        let result = {}
        for (let item of items) {
            let type = item[this.typeField] || '_unknown'
            let list = result[type] = result[type] || []
            list.push(item)
        }
        return result
    }

    /*
        Simple non-crypto UUID. See node-uuid if you require crypto UUIDs.
        Consider ULIDs which are crypto sortable.
    */
    uuid() {
        return UUID()
    }

    // Simple time-based, sortable unique ID.
    ulid() {
        return new ULID().toString()
    }

    initCrypto(crypto) {
        this.crypto = Object.assign(crypto)
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

    /*
        Marshall data into and out of DynamoDB format
    */
    marshall(item) {
        let client = this.client
        if (client.V3) {
            let options = client.params.marshall
            if (Array.isArray(item)) {
                for (let i = 0; i < item.length; i++) {
                    item[i] = client.marshall(item[i], options)
                }
            } else {
                item = client.marshall(item, options)
            }
        } else {
            if (Array.isArray(item)) {
                for (let i = 0; i < item.length; i++) {
                    item = this.marshallv2(item)
                }
            } else {
                item = this.marshallv2(item)
            }
        }
        return item
    }

    /*
        Marshall data out of DynamoDB format
    */
    unmarshall(item) {
        if (this.V3) {
            let client = this.client
            let options = client.params.unmarshall
            if (Array.isArray(item)) {
                for (let i = 0; i < item.length; i++) {
                    item[i] = client.unmarshall(item[i], options)
                }
            } else {
                item = client.unmarshall(item, options)
            }
        } else {
            if (Array.isArray(item)) {
                for (let i = 0; i < item.length; i++) {
                    item[i] = this.unmarshallv2(item[i])
                }
            } else {
                item = this.unmarshallv2(item)
            }

        }
        return item
    }

    marshallv2(item) {
        for (let [key, value] of Object.entries(item)) {
            if (value instanceof Set) {
                item[key] = this.client.createSet(Array.from(value))
                /*
                let first = value.values().next().value
                if (typeof first == 'number') {
                    item[key] = { NS: Array.from(value).map(v => v) }
                } else if (first instanceof Buffer || first instanceof ArrayBuffer) {
                    item[key] = { BS: Array.from(value).map(v => v.toString('base64')) }
                } else {
                    item[key] = { SS: Array.from(value).map(v => v.toString()) }
                } */
            }
        }
        return item
    }

    unmarshallv2(item) {
        for (let [key, value] of Object.entries(item)) {
            if (value != null && typeof value == 'object' && value.wrapperName == 'Set' && Array.isArray(value.values)) {
                let list = value.values
                if (value.type == 'Binary') {
                    //  Match AWS SDK V3 behavior
                    list = list.map(v => new Uint8Array(v))
                }
                item[key] = new Set(list)
            }
        }
        return item
    }
}

/*
    Emulate SenseLogs API
*/
class Log {
    constructor(logger) {
        if (logger === true) {
            this.logger = this.defaultLogger
        } else if (logger) {
            this.logger = logger
        }
    }
    data(message, context) {
        this.process('data', message, context)
    }

    emit(chan, message, context) {
        this.process(chan, message, context)
    }

    error(message, context) {
        this.process('error', message, context)
    }

    info(message, context) {
        this.process('info', message, context)
    }

    trace(message, context) {
        this.process('trace', message, context)
    }

    process(level, message, context) {
        if (this.logger) {
            this.logger(level, message, context)
        }
    }

    defaultLogger(level, message, context) {
        if (level == 'trace' || level == 'data') {
            //  params.log: true will cause the level to be changed to 'info'
            return
        }
        if (context) {
            console.log(level, message, JSON.stringify(context, null, 4))
        } else {
            console.log(level, message)
        }
    }
}
