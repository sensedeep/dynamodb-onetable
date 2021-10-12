/*
    Table.js - DynamoDB table class

    A OneTable Table represents a single (connected) DynamoDB table
 */

import Crypto from 'crypto'
import UUID from './UUID.js'
import ULID from './ULID.js'
import {Model} from './Model.js'

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
    chan: 'metrics',                                                //  Default channel
    dimensions: [
        'Table', 'Tenant', 'Source', 'Index', 'Model', 'Operation'  //  Default dimensions
    ],
    enable: true,                                                   //  Enabled
    hot: false,                                                     //  Hot partition tracking
    max: 100,                                                       //  Buffer metrics for 100 requests
    namespace: 'SingleTable/Metrics.1',                             //  CloudWatch metrics namespace
    period: 30,                                                     //  or buffer for 30 seconds
    properties: {},                                                 //  Additional properties to emit
    queries: true,                                                  //  Query profiling
    source: process.env.AWS_LAMBDA_FUNCTION_NAME || 'Default',      //  Default source name
    tenant: null,
}

const ReadWrite = {
    delete: 'write',
    get: 'read',
    find: 'read',
    put: 'write',
    scan: 'read',
    update: 'write',
    batchGet: 'read',
    batchWrite: 'write',
    transactGet: 'read',
    transactWrite: 'write',
}

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
const MigrationModel = '_Migration'
const SchemaModel = '_Schema'
const UniqueModel = '_Unique'
const SchemaKey = '_schema'
const UniqueKey = '_unique'
const SchemaFormat = 'onetable:1.0.0'

/*
    Represent a single DynamoDB table
 */
export class Table {

    constructor(params = {}) {
        if (!params.name) {
            throw new Error('Missing "name" property')
        }
        this.context = {}
        this.models = {}
        this.indexes = DefaultIndexes

        this.log = params.senselogs ? params.senselogs : new Log(params.logger)
        this.log.trace(`Loading OneTable`)

        if (params.client) {
            this.V3 = params.client.V3
            this.client = params.client
            this.service = this.V3 ? params.client : params.client.service
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
        this.setSchema(params.schema)
        this.createUniqueModel()
        this.createGenericModel()
        this.createSchemaModel()
        this.createMigrationModel()
    }

    setParams(params) {
        /*  LEGACY 1.7.4 - remove in 2.0.0
            Set legacyUnique to the PK separator. Previously was hard coded to ':' without a 'unique' prefix.
            Now, use the delimiter with a unique prefix.
            Defaults to be ':' in 1.7.
        */
        if (params.legacyUnique == true) {
            params.legacyUnique = ':'
        }
        this.createdField = params.createdField || 'created'
        this.delimiter = params.delimiter || '#'
        this.hidden = params.hidden != null ? params.hidden : true
        this.isoDates = params.isoDates || false
        this.nulls = params.nulls || false
        this.timestamps = params.timestamps != null ? params.timestamps : false
        this.typeField = params.typeField || '_type'
        this.updatedField = params.updatedField || 'updated'

        /*
            Preserve prior values for items that may have callback functions (intercept, metrics.properties, uuid)
            If a schema loads new params, then need to preserve these callback functions.
        */
        this.name = params.name || this.name
        //  DEPRECATE
        this.intercept = params.intercept || this.intercept
        this.transform = params.transform || this.transform
        if (params.metrics) {
            this.setMetrics(params.metrics)
        }
        if (params.uuid == 'uuid') {
            this.makeID = this.uuid
        } else if (params.uuid == 'ulid') {
            this.makeID = this.ulid
        } else if (!this.makeID) {
            //  Need to have uuid the default so browsers will resolve without node:crypto
            this.makeID = params.uuid || this.makeID || this.uuid
        }
        this.params = params
    }

    setClient(client) {
        this.client = client
        this.V3 = client.V3
        this.service = this.V3 ? this.client : this.client.service
    }

    setMetrics(params) {
        let metrics
        if (params == true) {
            metrics = Object.assign({}, DefaultMetrics)
        } else {
            metrics = Object.assign({}, DefaultMetrics, params)
        }
        //  LEGACY remove in 2.0 (was object)
        if (!Array.isArray(metrics.dimensions)) {
            metrics.dimensions = Object.keys(metrics.dimensions)
        }
        metrics.map = {Profile: true}
        for (let dim of metrics.dimensions) {
            metrics.map[dim] = true
        }
        metrics.period *= 1000
        metrics.count = 0
        metrics.lastFlushed = Date.now()
        metrics.counters = {}

        if (metrics.env && process.env) {
            let key = params.env != true ? params.env : 'LOG_FILTER'
            let filter = process.env[key]
            if (filter.indexOf('dbmetrics') < 0) {
                metrics.enable = false
            }
        }
        //  Preserve any prior defined properites functions
        metrics.properties = metrics.properties || this.metrics.properties
        this.metrics = metrics
    }

    /*
        Return the current schema. This may include model schema defined at run-time.
    */
    getSchema() {
        let schema = this.merge({}, this.schema, {params: this.getParams()})
        return this.transformSchemaForWrite(schema)
    }

    //  Prepare for persisting the schema
    transformSchemaForWrite(schema) {
        let params = schema.params || this.getParams()
        for (let [name, model] of Object.entries(schema.models)) {
            for (let [fname, field] of Object.entries(model)) {
                if (field.validate && field.validate instanceof RegExp) {
                    schema.models[name][fname].validate = `/${field.validate.source}/${field.validate.flags}`
                }
                let type = (typeof field.type == 'function') ? field.type.name : field.type
                field.type = type.toLowerCase()
            }
            delete model[params.typeField]
        }
        delete schema.models[SchemaModel]
        delete schema.models[MigrationModel]
        return schema
    }

    transformSchemaAfterRead(schema) {
        if (!schema.name) {
            schema.name == 'Current'
        }
        schema.models[SchemaModel] = this.schemaFields
        schema.models[MigrationModel] = this.migrationFields
        let params = schema.params || this.getParams()
        for (let [modelName, mdef] of Object.entries(schema.models)) {
            if (params.timestamps) {
                mdef[params.createdField] = {name: params.createdField, type: 'date'}
                mdef[params.updatedField] = {name: params.updatedField, type: 'date'}
            }
            mdef[params.typeField] = {name: params.typeField, type: 'string'}
        }
        return schema
    }

    /*
        Read the current schema saved in the table
    */
    async readSchema() {
        let indexes = this.indexes
        let primary = indexes.primary

        if (indexes == DefaultIndexes) {
            ({primary} = await this.getTableKeys())
        }
        let params = {
            [primary.hash]: SchemaKey
        }
        if (primary.sort) {
            params[primary.sort] = `${SchemaKey}:Current`
        }
        let schema = await this.getItem(params, {hidden: true, parse: true})
        return this.transformSchemaAfterRead(schema)
    }

    async readSchemas() {
        let indexes = this.indexes
        let primary = indexes.primary

        if (indexes == DefaultIndexes) {
            ({primary} = await this.getTableKeys())
        }
        let params = {
            [primary.hash]: `${SchemaKey}:`
        }
        /*
        if (primary.sort) {
            params[primary.sort] = {begins: SchemaKey}
        } */
        let schemas = await this.queryItems(params, {hidden: true, parse: true})
        for (let [index, schema] of Object.entries(schemas)) {
            schemas[index] = this.transformSchemaAfterRead(schema)
        }
        return schemas
    }

    async getTableKeys(refresh = false) {
        if (this.described && !refresh) {
            return this.described
        }
        let info = await this.describeTable()
        let indexes = {primary: {}}
        for (let key of info.Table.KeySchema) {
            let type = key.KeyType.toLowerCase() == 'hash' ? 'hash' : 'sort'
            indexes.primary[type] = key.AttributeName
        }
        if (info.Table.GlobalSecondaryIndexes) {
            for (let index of info.Table.GlobalSecondaryIndexes) {
                let keys = indexes[index.IndexName] = {}
                for (let key of index.KeySchema) {
                    let type = key.KeyType.toLowerCase() == 'hash' ? 'hash' : 'sort'
                    keys[type] = key.AttributeName
                }
                indexes[index.IndexName] = keys
            }
        }
        this.described = indexes
        return this.described
    }

    /*
        Update the schema model saved in the database _Schema model.
        NOTE: this does not update the current schema used by the Table instance.
    */
    async saveSchema(schema) {
        if (schema) {
            schema = this.merge({}, schema)
            if (!schema.params) {
                schema.params = this.getParams()
            }
            if (!schema.models) {
                schema.models = {}
            }
            if (!schema.indexes) {
                schema.indexes = this.indexes || DefaultIndexes
            }
            if (!schema.queries) {
                schema.queries = {}
            }
            schema = this.transformSchemaForWrite(schema)
        } else {
            schema = this.getSchema()
        }
        if (!schema) {
            throw new Error('No schema to save')
        }
        //  REPAIR no name
        if (!schema.name) {
            schema.name = 'Current'
        }
        schema.version = schema.version || '0.0.1'
        schema.format = SchemaFormat

        //  LEGACY
        // schema.models[SchemaModel] = this.schemaFields
        // schema.models[MigrationModel] = this.migrationFields

        let model = this.getModel(SchemaModel)
        return await model.update(schema, {exists: null})
    }

    async removeSchema(schema) {
        let model = this.getModel(SchemaModel)
        await model.remove(schema)
    }

    /*
        Set the schema and models. If schema is unset, then this clears the prior schema.
        NOTE: does not update the saved schema in the table.
    */
    setSchema(schema) {
        this.models = {}
        this.indexes = DefaultIndexes

        if (!schema) return

        if (!schema.version) {
            throw new Error('Schema is missing a version')
        }
        let {models, indexes, params} = schema
        if (!models) {
            models = {}
        }
        if (!indexes) {
            indexes = DefaultIndexes
        }
        this.indexes = indexes
        //  Must set before creating models
        if (params) {
            this.setParams(params)
        }
        for (let [name, model] of Object.entries(models)) {
            if (name == SchemaModel || name == MigrationModel) continue
            this.models[name] = new Model(this, name, {fields: model, indexes})
        }
        this.schema = schema

        //  Must re-create as delimiter may have changed (currently schema & migration hard coded with ':' delimiter)
        this.createUniqueModel()
        this.createGenericModel()
        this.createSchemaModel()
        this.createMigrationModel()
    }

    getParams() {
        return {
            createdField: this.createdField,
            delimiter: this.delimiter,
            hidden: this.hidden,
            isoDates: this.isoDates,
            nulls: this.nulls,
            timestamps: this.timestamps,
            typeField: this.typeField,
            updatedField: this.updatedField,
            uuid: this.uuid,
        }
    }

    /*
        Model for unique attributes
     */
    createUniqueModel() {
        let primary = this.indexes.primary
        /*
            LEGACY 1.7.4 - remove in 2.0.0
            Set legacyUnique to the PK separator. Previously was hard coded to ':' without a 'unique' prefix.
            Now, use the delimiter with a unique prefix.
            Defaults to be ':' in 1.7.
        */
        let sep = this.params.legacyUnique || this.delimiter
        let fields = {
            [primary.hash]: { type: String, value: `${UniqueKey}${sep}\${` + primary.hash + '}'},
        }
        if (primary.sort) {
            fields[primary.sort] = { type: String, value: `${UniqueKey}${sep}`}
        }
        this.uniqueModel = new Model(this, UniqueModel, {
            fields: fields,
            indexes: this.indexes,
            timestamps: false
        })
    }

    /*
        Model for genric low-level API access. Generic models allow reading attributes that are not defined on the schema.
     */
    createGenericModel() {
        let primary = this.indexes.primary
        let fields = {[primary.hash]: {type: String}}
        if (primary.sort) {
            fields[primary.sort] = {type: String}
        }
        this.genericModel = new Model(this, GenericModel, {
            fields: fields,
            indexes: this.indexes,
            timestamps: false,
            generic: true,
        })
    }

    createSchemaModel() {
        let indexes = this.indexes
        let primary = indexes.primary
        //  Delimiter here is hard coded because we need to be able to read a schema before we know what the delimiter is.
        let delimiter = ':'
        let fields = this.schemaFields = {
            [primary.hash]: { type: 'string', required: true, value: `${SchemaKey}${delimiter}` },
            [primary.sort]: { type: 'string', required: true, value: `${SchemaKey}${delimiter}\${name}` },
            format:         { type: 'string', required: true },
            name:           { type: 'string', required: true },
            indexes:        { type: 'array',  required: true },
            models:         { type: 'array',  required: true },
            params:         { type: 'object', required: true },
            queries:        { type: 'object', required: true },
            version:        { type: 'string', required: true },
        }
        this.models[SchemaModel] = this.schemaModel = new Model(this, SchemaModel, {fields, indexes, delimiter})
    }

    createMigrationModel() {
        let indexes = this.indexes
        let primary = indexes.primary
        //  Delimiter here is hard coded because we need to be able to read a migration/schema before we know what the delimiter is.
        let delimiter = ':'
        let fields = this.migrationFields = {
            [primary.hash]: { type: 'string', value: `_migrations${delimiter}` },
            [primary.sort]: { type: 'string', value: `_migrations${delimiter}\${version}` },
            description:    { type: 'string', required: true },
            date:           { type: 'date',   required: true },
            path:           { type: 'string', required: true },
            version:        { type: 'string', required: true },
        }
        this.models[MigrationModel] = this.migrationModel = new Model(this, MigrationModel, {fields, indexes, delimiter})
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
        this.log.trace(`OneTable createTable for "${this.name}"`, {def})
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
            this.log.trace(`OneTable deleteTable for "${this.name}"`)
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
        if (!name) {
            throw new Error('Undefined model name')
        }
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

    //  DEPRECATE in 2.0
    clear() {
        return this.clearContext()
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

    async execute(model, op, cmd, params = {}, properties = {}) {
        let mark = new Date()
        let trace = {model, cmd, op, properties}
        let result
        try {
            if (params.stats || this.metrics) {
                cmd.ReturnConsumedCapacity = params.capacity || 'INDEXES'
                cmd.ReturnItemCollectionMetrics = 'SIZE'
            }
            this.log[params.log ? 'info' : 'trace'](`OneTable "${op}" "${model}"`, {trace})
            if (this.V3) {
                result = await this.client[op](cmd)
            } else {
                result = await this.client[DocumentClientMethods[op]](cmd).promise()
            }

        } catch (err) {
            if (params.throw === false) {
                result = {}

            } else if (err.code == 'ConditionalCheckFailedException' && op == 'put') {
                //  Not a hard error -- typically part of normal operation
                this.log.info(`Conditional check failed "${op}" on "${model}"`, {err, trace})
                throw new Error(`Conditional create failed for "${model}`)

            } else {
                result = result || {}
                result.Error = 1
                trace.err = err
                if (params.log != false) {
                    this.log.error(`OneTable exception in "${op}" on "${model}"`, {err, trace})
                }
                throw err
            }

        } finally {
            if (result && this.metrics && this.metrics.enable && this.log.enabled(this.metrics.chan)) {
                this.addMetrics(model, op, result, params, mark)
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
        batch.ConsistentRead = params.consistent ? true : false

        let result = await this.execute(GenericModel, 'batchGet', batch, {}, params)

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
        return result
    }

    async batchWrite(batch, params = {}) {
        if (Object.getOwnPropertyNames(batch).length == 0) {
            return {}
        }
        return await this.execute(GenericModel, 'batchWrite', batch, params)
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
        let result = await this.execute(GenericModel, op == 'write' ? 'transactWrite' : 'transactGet', transaction, params)
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

    addMetrics(model, op, result, params, mark) {
        let metrics = this.metrics
        let timestamp = Date.now()

        let capacity = 0
        let consumed = result.ConsumedCapacity
        if (consumed) {
            //  Batch and transaction return array
            if (Array.isArray(consumed)) {
                for (let item of consumed) {
                    //  Only count this table name
                    if (item.TableName == this.name) {
                        capacity += item.CapacityUnits
                    }
                }
            } else {
                capacity = consumed.CapacityUnits
            }
        }
        let values = {
            count: result.Count || 1,
            latency: timestamp - mark,
            scanned: result.ScannedCount || 1,
            op, capacity,
        }
        let dimensionValues = {
            Table: this.name,
            Tenant: metrics.tenant,
            Source: params.source || metrics.source,
            Index: params.index || 'primary',
            Model: model,
            Operation: DynamoOps[op],
        }
        let properties
        if (typeof metrics.properties == 'function') {
            properties = metrics.properties(operation, params, result)
        } else {
            properties = metrics.properties || {}
        }
        this.addMetricGroup(values, dimensionValues, properties)

        if (metrics.queries && params.profile) {
            dimensionValues.Profile = params.profile
            this.addMetric('Profile', values, ['Profile'], dimensionValues, properties)
        }
        if (++metrics.count >= metrics.max || (metrics.lastFlushed + metrics.period) < timestamp) {
            this.flushMetrics(timestamp)
            metrics.count = 0
            metrics.lastFlushed = timestamp
        }
    }

    addMetricGroup(values, dimensionValues, properties) {
        let dimensions = [], keys = []
        for (let name of this.metrics.dimensions) {
            let dimension = dimensionValues[name]
            if (dimension) {
                keys.push(dimension)
                dimensions.push(name)
                this.addMetric(keys.join('.'), values, dimensions, dimensionValues, properties)
            }
        }
    }

    addMetric(key, values, dimensions, dimensionValues, properties) {
        let rec = this.metrics.counters[key] = this.metrics.counters[key] || {
            totals: { count: 0, latency: 0, read: 0, requests: 0, scanned: 0, write: 0 },
            dimensions: dimensions.slice(0),
            dimensionValues,
            properties,
        }
        let totals = rec.totals
        totals[ReadWrite[values.op]] += values.capacity    //  RCU, WCU
        totals.latency += values.latency                          //  Latency in ms
        totals.count += values.count                              //  Item count
        totals.scanned += values.scanned                          //  Items scanned
        totals.requests++                                         //  Number of requests
    }

    flushMetrics(timestamp = Date.now()) {
        if (!this.metrics.enable) return
        for (let [key, rec] of Object.entries(this.metrics.counters)) {
            Object.keys(rec).forEach(field => rec[field] === 0 && delete rec[field])
            this.emitMetrics(timestamp, rec)
        }
    }

    emitMetrics(timestamp, rec) {
        let {dimensionValues, dimensions, properties, totals} = rec
        let metrics = this.metrics

        let requests = totals.requests
        totals.latency = totals.latency / requests
        totals.count = totals.count / requests
        totals.scanned = totals.scanned / requests

        if (this.log.metrics) {
            let chan = metrics.chan || 'metrics'
            this.log.metrics(chan, `OneTable Custom Metrics ${dimensions}`,
                metrics.namespace, totals, dimensions, {latency: 'Milliseconds', default: 'Count'},
                Object.assign({}, dimensionValues, properties))

        } else {
            let metrics = dimensions.map(v => {
                return {Name: v, Unit: v == 'latency' ? 'Milliseconds' : 'Count'}
            })
            let data = Object.assign({
                _aws: {
                    Timestamp: timestamp,
                    CloudWatchMetrics: [{
                        Dimensions: [dimensions],
                        Namespace: metrics.namespace,
                        Metrics: metrics,
                    }]
                },
            }, totals, dimensionValues, properties)
            console.log(`OneTable Custom Metrics ${dimensions}` + JSON.stringify(data))
        }
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

    setMakeID(fn) {
        this.makeID = fn
    }

    /*
        Return the value template variable references in a list
     */
    getVars(v) {
        let list = []
        if (Array.isArray(v)) {
            list = v
        } else if (typeof v != 'function') {
            //  FUTURE - need 'depends' to handle function dependencies
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

    mergeOne(recurse, dest, src) {
        if (recurse++ > 50) {
            throw new Error('Recursive clone')
        }
        for (let [key, value] of Object.entries(src)) {
            if (value === undefined) {
                continue

            } else if (value instanceof Date) {
                dest[key] = new Date(value)

            } else if (value instanceof RegExp) {
                dest[key] = new RegExp(value.source, value.flags)

            } else if (Array.isArray(value)) {
                if (!Array.isArray(dest[key])) {
                    dest[key] = []
                }
                dest[key] = this.mergeOne(recurse, dest[key], value)

            } else if (typeof value == 'object' && !(value instanceof RegExp || value == null)) {
                if (typeof dest[key] != 'object') {
                    dest[key] = {}
                }
                dest[key] = this.mergeOne(recurse, dest[key], value)

            } else {
                dest[key] = value
            }
        }
        return dest
    }

    merge(dest, ...sources) {
        for (let src of sources) {
            dest = this.mergeOne(0, dest, src)
        }
        return dest
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
