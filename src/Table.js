/*
    Table.js - DynamoDB table class

    A OneTable Table represents a single (connected) DynamoDB table
 */

import Crypto from 'crypto'
import UUID from './UUID.js'
import ULID from './ULID.js'
import {Expression} from './Expression.js'
import {Schema} from './Schema.js'
import {Metrics} from './Metrics.js'
import {OneTableArgError, OneTableError, checkErr} from './Error.js'

/*
    AWS V2 DocumentClient methods
 */
const DocumentClientMethods = {
    delete: 'delete',
    get: 'get',
    find: 'query',
    put: 'put',
    scan: 'scan',
    update: 'update',
    batchGet: 'batchGet',
    batchWrite: 'batchWrite',
    transactGet: 'transactGet',
    transactWrite: 'transactWrite',
}

/*
    Safety string required on API to delete a table
*/
const ConfirmRemoveTable = 'DeleteTableForever'

/*
    Crypto IV length
*/
const IV_LENGTH = 16

const DynamoOps = {
    delete: 'deleteItem',
    get: 'getItem',
    find: 'query',
    put: 'putItem',
    scan: 'scan',
    update: 'updateItem',
    batchGet: 'batchGet',
    batchWrite: 'batchWrite',
    transactGet: 'transactGet',
    transactWrite: 'transactWrite',
}

const GenericModel = '_Generic'

const maxBatchSize = 25

/*
    Represent a single DynamoDB table
 */
export class Table {

    constructor(params = {}) {
        if (!params.name) {
            throw new OneTableArgError('Missing "name" property')
        }
        this.context = {}

        this.log = params.senselogs ? params.senselogs : new Log(params.logger)
        this.log.trace(`Loading OneTable`)

        if (params.client) {
            this.setClient(params.client)
        }
        if (params.crypto) {
            this.initCrypto(params.crypto)
            this.crypto = Object.assign(params.crypto)
            for (let [name, crypto] of Object.entries(this.crypto)) {
                crypto.secret = Crypto.createHash('sha256').update(crypto.password, 'utf8').digest()
                this.crypto[name] = crypto
                this.crypto[name].name = name
            }
        }
        this.setParams(params)
        this.schema = new Schema(this, params.schema)
        if (params.dataloader) {
            this.dataloader = new params.dataloader(cmds => this.batchLoaderFunction(cmds), {maxBatchSize})
        }
    }

    setClient(client) {
        this.client = client
        this.V3 = client.V3
        this.service = this.V3 ? this.client : this.client.service
    }

    setParams(params) {
        //  DEPRECATED - these should be supplied by the schema.params
        if (params.createdField != null || this.hidden != null || this.isoDates != null || this.nulls != null ||
                this.timestamps != null || this.typeField != null || this.updatedField != null) {
            console.warn('OneTable: Using deprecated Table constructor parameters. Define in the schema.params instead.')
            //  FUTURE 2.3
            //  throw new OneTableArgError('Using deprecated Table constructor parameters. Define in the schema.params instead.')
        }
        this.createdField = params.createdField || 'created'
        this.hidden = params.hidden != null ? params.hidden : true
        this.isoDates = params.isoDates || false
        this.nulls = params.nulls || false
        this.timestamps = params.timestamps != null ? params.timestamps : false
        this.typeField = params.typeField || '_type'
        this.updatedField = params.updatedField || 'updated'
        this.warn = params.warn || true

        if (params.uuid) {
            console.warn('OneTable: Using deprecated Table constructor "uuid" parameter. Use a "generate" function instead or ' +
                         'Set schema models to use "generate: uuid|ulid" explicitly.')
            params.generate = params.generate | params.uuid
        }

        if (typeof params.generate == 'function') {
            this.generate = params.generate || this.uuid
        } else if (params.generate) {
            //  FUTURE throw exception
            console.warn('OneTable: Generate can only be a function')
            if (params.generate == 'uuid') {
                this.generate = this.uuid
            } else if (params.generate == 'ulid') {
                this.generate = this.ulid
            } else {
                this.generate = this.uuid
            }
        }

        this.name = params.name

        if (params.metrics) {
            this.metrics = new Metrics(this, params.metrics, this.metrics)
        }
        if (params.monitor) {
            this.monitor = params.monitor
        }
        this.params = params
    }

    setSchemaParams(params) {
        this.createdField = params.createdField || 'created'
        this.hidden = params.hidden != null ? params.hidden : true
        this.isoDates = params.isoDates || false
        this.nulls = params.nulls || false
        this.timestamps = params.timestamps != null ? params.timestamps : false
        this.typeField = params.typeField || '_type'
        this.updatedField = params.updatedField || 'updated'
    }

    getSchemaParams() {
        return {
            createdField: this.createdField,
            hidden: this.hidden,
            isoDates: this.isoDates,
            nulls: this.nulls,
            timestamps: this.timestamps,
            typeField: this.typeField,
            updatedField: this.updatedField,
        }
    }

    async setSchema(schema) {
        return await this.schema.setSchema(schema)
    }

    getCurrentSchema() {
        return this.schema.getCurrentSchema()
    }

    async getKeys() {
        return await this.schema.getKeys()
    }

    async getPrimaryKeys() {
        let keys = await this.schema.getKeys()
        return keys.primary
    }

    async readSchema() {
        return this.schema.readSchema()
    }

    async readSchemas() {
        return this.schema.readSchemas()
    }

    async removeSchema(schema) {
        return this.schema.removeSchema(schema)
    }

    async saveSchema(schema) {
        return this.schema.saveSchema(schema)
    }

    /*
        Create a DynamoDB table. Uses the current schema index definition.
        Alternatively, params may contain standard DynamoDB createTable parameters.
    */
    async createTable(params = {}) {
        let def = {
            AttributeDefinitions: [],
            KeySchema: [],
            LocalSecondaryIndexes: [],
            GlobalSecondaryIndexes: [],
            TableName: this.name,
        }
        let provisioned = params.provisioned || params.ProvisionedThroughput
        if (provisioned) {
            if (!provisioned.ReadCapacityUnits && !provisioned.WriteCapacityUnits) {
                def.BillingMode = 'PAY_PER_REQUEST'
            } else {
                def.ProvisionedThroughput = provisioned
                def.BillingMode = 'PROVISIONED'
            }
        } else {
            def.BillingMode = 'PAY_PER_REQUEST'
        }
        let attributes = {}
        let {indexes} = this.schema

        if (!indexes) {
            throw new OneTableArgError('Cannot create table without schema indexes')
        }
        for (let [name, index] of Object.entries(indexes)) {
            let keys
            if (name == 'primary') {
                keys = def.KeySchema
            } else {
                let collection = index.type == 'local' ? 'LocalSecondaryIndexes' : 'GlobalSecondaryIndexes'
                keys = []
                let project, projection
                if (Array.isArray(index.project)) {
                    projection = 'INCLUDE'
                    project = index.project.filter(a => a != indexes.primary.hash && a != indexes.primary.sort)
                } else if (index.project == 'keys') {
                    projection = 'KEYS_ONLY'
                } else {
                    projection = 'ALL'
                }
                let projDef = {
                    IndexName: name,
                    KeySchema: keys,
                    Projection: {
                        ProjectionType: projection,
                    }
                }
                if (project) {
                    projDef.Projection.NonKeyAttributes = project
                }
                def[collection].push(projDef)
            }
            keys.push({AttributeName: index.hash || indexes.primary.hash, KeyType: 'HASH'})

            if (index.hash && !attributes[index.hash]) {
                let type = this.getAttributeType(index.hash) == 'number' ? 'N' : 'S'
                def.AttributeDefinitions.push({AttributeName: index.hash, AttributeType: type})
                attributes[index.hash] = true
            }
            if (index.sort) {
                if (!attributes[index.sort]) {
                    let type = this.getAttributeType(index.sort) == 'number' ? 'N' : 'S'
                    def.AttributeDefinitions.push({AttributeName: index.sort, AttributeType: type})
                    attributes[index.sort] = true
                }
                keys.push({AttributeName: index.sort, KeyType: 'RANGE'})
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
        this.log.trace(`OneTable createTable for "${this.name}"`, {def})
        if (this.V3) {
            return await this.service.createTable(def)
        } else {
            return await this.service.createTable(def).promise()
        }
    }

    getAttributeType(name) {
        for (let model of Object.values(this.schema.models)) {
            let fields = model.block.fields
            if (fields[name]) {
                return fields[name].type
            }
        }
        return null
    }

    /*
        Delete the DynamoDB table forever. Be careful.
    */
    async deleteTable(confirmation) {
        if (confirmation == ConfirmRemoveTable) {
            this.log.trace(`OneTable deleteTable for "${this.name}"`)
            if (this.V3) {
                await this.service.deleteTable({TableName: this.name})
            } else {
                await this.service.deleteTable({TableName: this.name}).promise()
            }
        } else {
            throw new OneTableArgError(`Missing required confirmation "${ConfirmRemoveTable}"`)
        }
    }

    async updateTable(params = {}) {
        let def = {
            AttributeDefinitions: [],
            GlobalSecondaryIndexUpdates: [],
            TableName: this.name,
        }
        let {create, provisioned} = params

        if (provisioned) {
            if (!provisioned.ReadCapacityUnits && !provisioned.WriteCapacityUnits) {
                def.BillingMode = 'PAY_PER_REQUEST'
            } else {
                if (!create) {
                    def.ProvisionedThroughput = provisioned
                }
                def.BillingMode = 'PROVISIONED'
            }
        }
        let indexes = this.schema.indexes
        if (!indexes) {
            throw new OneTableArgError('Cannot update table without schema indexes')
        }
        if (create) {
            if (create.hash == null || create.hash == indexes.primary.hash || create.type == 'local') {
                throw new OneTableArgError('Cannot update table to create an LSI')
            }
            let keys = []
            let projection, project

            if (Array.isArray(create.project)) {
                projection = 'INCLUDE'
                project = create.project.filter(a => a != create.hash && a != create.sort)
            } else if (create.project == 'keys') {
                projection = 'KEYS_ONLY'
            } else {
                projection = 'ALL'
            }
            let projDef = {
                IndexName: create.name,
                KeySchema: keys,
                Projection: {
                    ProjectionType: projection,
                }
            }
            if (project) {
                projDef.Projection.NonKeyAttributes = project
            }
            keys.push({AttributeName: create.hash, KeyType: 'HASH'})
            def.AttributeDefinitions.push({AttributeName: create.hash, AttributeType: 'S'})

            if (create.sort) {
                def.AttributeDefinitions.push({AttributeName: create.sort, AttributeType: 'S'})
                keys.push({AttributeName: create.sort, KeyType: 'RANGE'})
            }
            if (provisioned) {
                projDef.ProvisionedThroughput = provisioned
            }
            def.GlobalSecondaryIndexUpdates.push({Create: projDef})

        } else if (params.remove) {
            def.GlobalSecondaryIndexUpdates.push({Delete: {IndexName: params.remove.name}})

        } else if (params.update) {
            let update = {Update: {IndexName: params.update.name}}
            if (provisioned) {
                update.Update.ProvisionedThroughput = provisioned
            }
            def.GlobalSecondaryIndexUpdates.push(update)
        }
        if (def.GlobalSecondaryIndexUpdates.length == 0) {
            delete def.GlobalSecondaryIndexUpdates

        }
        this.log.trace(`OneTable updateTable for "${this.name}"`, {def})
        if (this.V3) {
            return await this.service.updateTable(def)
        } else {
            return await this.service.updateTable(def).promise()
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
        return this.schema.listModels()
    }

    addModel(name, fields) {
        this.schema.addModel(name, fields)
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
        return this.schema.getModel(name)
    }

    removeModel(name) {
        return this.schema.removeModel(name)
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

    /*  PROTOTYPE
        Create a clone of the table with the same settings and replace the context
    */
    child(context) {
        let table = JSON.parse(JSON.stringify(this))
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

    async load(modelName, properties, params) {
        let model = this.getModel(modelName)
        return await model.load(properties, params)
    }

    init(modelName, properties, params) {
        let model = this.getModel(modelName)
        return model.init(properties, params)
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

    async execute(model, op, cmd, properties = {}, params = {}) {
        let mark = new Date()
        let trace = {model, cmd, op, properties}
        let result
        try {
            let client = params.client || this.client
            if (params.stats || this.metrics || this.monitor) {
                cmd.ReturnConsumedCapacity = params.capacity || 'INDEXES'
                cmd.ReturnItemCollectionMetrics = 'SIZE'
            }
            this.log[params.log ? 'info' : 'trace'](`OneTable "${op}" "${model}"`, {trace})
            if (this.V3) {
                result = await client[op](cmd)
            } else {
                result = await client[DocumentClientMethods[op]](cmd).promise()
            }

        } catch (err) {
            if (params.throw === false) {
                result = {}

            } else if (checkErr(err, 'ConditionalCheckFailedException') && op == 'put') {
                //  Not a hard error -- typically part of normal operation
                this.log.info(`Conditional check failed "${op}" on "${model}"`, {err, trace})
                throw new OneTableError(`Conditional create failed for "${model}"`, {code: 'ConditionError', trace, err})

            } else if (checkErr(err, 'ProvisionedThroughputExceededException')) {
                throw err
                // FUTURE throw new OneTableError(`Provisioned throughput exceeded`, {code: 'ProvisionedThroughputExceededException', trace, err})

            } else {
                result = result || {}
                result.Error = 1
                trace.err = err
                if (params.log != false) {
                    this.log.error(`OneTable exception in "${op}" on "${model}"`, {err, trace})
                }
                throw new OneTableError(`OneTable execute failed "${op}" for "${model}. ${err.message}`, {err})
            }

        } finally {
            if (result) {
                if (this.metrics) {
                    this.metrics.add(model, op, result, params, mark)
                }
                if (this.monitor) {
                    await this.monitor(model, op, result, params, mark)
                }
            }
        }
        if (typeof params.info == 'object') {
            params.info.operation = DynamoOps[op]
            params.info.args = cmd
            params.info.properties = properties
        }
        return result
    }

    /*
        The low level API does not use models. It permits the reading / writing of any attribute.
    */
    async batchGet(batch, params = {}) {
        if (Object.getOwnPropertyNames(batch).length == 0) {
            return []
        }
        let def = batch.RequestItems[this.name]

        if (params.fields) {
            if (params.fields.indexOf(this.typeField) < 0) {
                params.fields.push(this.typeField)
            }
            let expression = new Expression(this.schema.genericModel, 'batchGet', {}, params)
            let cmd = expression.command()
            def.ProjectionExpression = cmd.ProjectionExpression
            def.ExpressionAttributeNames = cmd.ExpressionAttributeNames
        }
        def.ConsistentRead = params.consistent ? true : false

        let result = await this.execute(GenericModel, 'batchGet', batch, {}, params)

        let response = result.Responses
        if (params.parse && response) {
            result = []
            for (let items of Object.values(response)) {
                for (let item of items) {
                    item = this.unmarshall(item, params)
                    let type = item[this.typeField] || '_unknown'
                    let model = this.schema.models[type]
                    if (model && model != this.schema.uniqueModel) {
                        result.push(model.transformReadItem('get', item, {}, params))
                    }
                }
            }
        }
        return result
    }

    /*
        AWS BatchWrite may throw an exception of no items can be processed. Otherwise it will retry (up to 11 times)
        and return partial results in UnprocessedItems. Those will be handled here if possible.
    */
    async batchWrite(batch, params = {}) {
        if (Object.getOwnPropertyNames(batch).length == 0) {
            return {}
        }
        let retries = 0, more
        do {
            more = false
            let response = await this.execute(GenericModel, 'batchWrite', batch, params)
            let data = response.data
            if (data && data.UnprocessedItems && Object.keys(data.UnprocessedItems).length) {
                batch.RequestItems = data.UnprocessedItems
                if (params.reprocess === false) {
                    return false
                }
                if (retries > 11) {
                    throw new Error(response.UnprocessedItems)
                }
                await this.delay(10 * (2 ** retries++))
                more = true
            }
        } while (more)
        return true
    }

    async batchLoad(expression) {
        if (this.dataloader) {
            return await this.dataloader.load(expression)
        }
        throw new Error('params.dataloader DataLoader constructor is required to use load feature')
    }

    async deleteItem(properties, params) {
        return await this.schema.genericModel.deleteItem(properties, params)
    }

    async getItem(properties, params) {
        return await this.schema.genericModel.getItem(properties, params)
    }

    async putItem(properties, params) {
        return await this.schema.genericModel.putItem(properties, params)
    }

    async queryItems(properties, params) {
        return await this.schema.genericModel.queryItems(properties, params)
    }

    async scanItems(properties, params) {
        return await this.schema.genericModel.scanItems(properties, params)
    }

    async updateItem(properties, params) {
        return await this.schema.genericModel.updateItem(properties, params)
    }

    async fetch(models, properties, params) {
        return await this.schema.genericModel.fetch(models, properties, params)
    }

    /*
        Invoke a prepared transaction. Note: transactGet does not work on non-primary indexes.
     */
    async transact(op, transaction, params = {}) {
        let result = await this.execute(GenericModel, op == 'write' ? 'transactWrite' : 'transactGet', transaction, params)
        if (op == 'get') {
            if (params.parse) {
                let items = []
                for (let r of result.Responses) {
                    if (r.Item) {
                        let item = this.unmarshall(r.Item, params)
                        let type = item[this.typeField] || '_unknown'
                        let model = this.schema.models[type]
                        if (model && model != this.schema.uniqueModel) {
                            items.push(model.transformReadItem('get', item, {}, params))
                        }
                    }
                }
                result = items
            }
        }
        return result
    }

    /*
        Convert items into a map of items by model type
    */
    groupByType(items, params={}) {
        let result = {}
        for (let item of items) {
            let type = item[this.typeField] || '_unknown'
            let list = result[type] = result[type] || []
            let model = this.schema.models[type]
            let preparedItem
            if (typeof params.hidden === 'boolean' && !params.hidden) {
                let fields = model.block.fields
                preparedItem = {}
                for (let [name, field] of Object.entries(fields)) {
                    if (!(field.hidden && params.hidden !== true)) {
                        preparedItem[name] = item[name]
                    }
                }
            } else {
                preparedItem = item
            }
            list.push(preparedItem)
        }
        return result
    }

    /**
     * this is a function passed to the DataLoader that given an array of Expression
     * will group all commands by TableName and make all Keys unique and then will perform
     * a BatchGet request and process the response of the BatchRequest to return an array
     * with the corresponding response in the same order as it was requested.
     *
     * @param expressions
     * @returns {Promise<*>}
     */
    async batchLoaderFunction(expressions) {
        const commands = expressions.map(each => each.command())

        const groupedByTableName =  commands.reduce((groupedBy, item) => {
            const tableName = item.TableName
            if (!groupedBy[tableName]) groupedBy[tableName] = []
            groupedBy[tableName].push(item)
            return groupedBy
        }, {})

        // convert each of the get requests into a single RequestItem with unique Keys
        const requestItems = Object.keys(groupedByTableName).reduce((requestItems, tableName) => {
            // batch get does not support duplicate Keys, so we need to make them unique
            // it's complex because we have the unmarshalled values on the Keys when it's V3
            const allKeys = groupedByTableName[tableName].map(each => each.Key)
            const uniqueKeys = allKeys.filter((key1, index1, self) => {
                const index2 = self.findIndex(key2 => {
                    return Object.keys(key2).every(prop => {
                        if (this.V3) {
                            const type = Object.keys(key1[prop])[0] // { S: "XX" } => type is S
                            return key2[prop][type] === key1[prop][type]
                        }
                        return key2[prop] === key1[prop]
                    })
                })
                return index2 === index1
            })
            requestItems[tableName] = {Keys: uniqueKeys}
            return requestItems
        }, {})

        const results = await this.batchGet({RequestItems: requestItems})

        // return the exact mapping (on same order as input) of each get command request to the result from database
        // to do that we need to find in the Responses object the item that was request and return it in the same position
        return commands.map((command, index) => {
            const {model, params} = expressions[index]

            // each key is { pk: { S: "XX" } } when V3 or { pk: "XX" } when V2
            // on map function, key will be pk and unmarshalled will be { S: "XX" }, OR "XXX"
            const criteria = Object.entries(command.Key).map(([key, unmarshalled]) => {
                if (this.V3) {
                    const type = Object.keys(unmarshalled)[0] // the type will be S
                    return [[key, type], unmarshalled[type]] // return [[pk, S], "XX"]
                }
                return [[key], unmarshalled]
            })

            // finds the matching object in the unmarshalled Responses array with criteria Key above
            const findByKeyUnmarshalled = (items = []) => items.find(item => {
                return criteria.every(([[prop, type], value]) => {
                    if (type) return item[prop][type] === value // if it has a type it means it is V3
                    return item[prop] === value
                })
            })

            const items = results.Responses[command.TableName]
            const item = findByKeyUnmarshalled(items)
            if (item) {
                const unmarshalled = this.unmarshall(item, params)
                return model.transformReadItem('get', unmarshalled, {}, params)
            }
        })
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

    setGenerate(fn) {
        this.generate = fn
    }

    /*
        Return the value template variable references in a list
     */
    getVars(v) {
        let list = []
        if (Array.isArray(v)) {
            list = v
        } else if (typeof v == 'string') {
            v.replace(/\${(.*?)}/g, (match, varName) => {
                list.push(varName)
            })
        }
        return list
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
                throw new OneTableArgError('No database secret or cipher defined')
            }
            let crypto = this.crypto[name]
            if (!crypto) {
                throw new OneTableArgError(`Database crypto not defined for ${name}`)
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
                throw new OneTableArgError('No database secret or cipher defined')
            }
            let crypto = this.crypto[name]
            if (!crypto) {
                throw new OneTableArgError(`Database crypto not defined for ${name}`)
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
    marshall(item, params) {
        let client = params.client || this.client
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
                    item = this.marshallv2(item, params)
                }
            } else {
                item = this.marshallv2(item, params)
            }
        }
        return item
    }

    /*
        Marshall data out of DynamoDB format
    */
    unmarshall(item, params) {
        if (this.V3) {
            let client = params.client || this.client
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

    marshallv2(item, params) {
        let client = params.client || this.client
        for (let [key, value] of Object.entries(item)) {
            if (value instanceof Set) {
                item[key] = client.createSet(Array.from(value))
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

    /*
        Recursive Object.assign. Will clone dates, regexp, simple objects and arrays.
        Other class instances and primitives are copied not cloned.
        Max recursive depth of 20
    */
    assign(dest, ...sources) {
        for (let src of sources) {
            if (src) {
                dest = this.assignInner(dest, src)
            }
        }
        return dest
    }

    assignInner(dest, src, recurse = 0) {
        if (recurse++ > 20) {
            throw new OneTableError('Recursive merge', {code: 'RuntimeError'})
        }
        if (!src || !dest || typeof src != 'object') {
            return
        }
        for (let [key, v] of Object.entries(src)) {
            if (v === undefined) {
                continue

            } else if (v instanceof Date) {
                dest[key] = new Date(v)

            } else if (v instanceof RegExp) {
                dest[key] = new RegExp(v.source, v.flags)

            } else if (Array.isArray(v)) {
                if (!Array.isArray(dest[key])) {
                    dest[key] = []
                }
                if (v.length) {
                    dest[key] = this.assignInner([key], v, recurse)
                }

            } else if (typeof v == 'object' && v != null && v.constructor.name == 'Object') {
                if (typeof dest[key] != 'object') {
                    dest[key] = {}
                }
                dest[key] = this.assignInner(dest[key], v, recurse)

            } else {
                dest[key] = v
            }
        }
        return dest
    }

    async delay(time) {
        return new Promise(function(resolve) {
            setTimeout(() => resolve(true), time)
        })
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

    enabled() {
        return true
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
