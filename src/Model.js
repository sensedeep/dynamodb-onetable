/*
    Model.js - DynamoDB model class
*/
import {Expression} from './Expression.js'

/*
    DynamoDB API methods mapped to dynamo
 */
const DocumentClientMethods = {
    delete: 'delete',
    get: 'get',
    find: 'query',
    put: 'put',
    scan: 'scan',
    update: 'update'
}

/*
    Ready / write tags for interceptions
 */
const InterceptTags = {
    delete: 'write',
    get: 'read',
    find: 'read',
    put: 'write',
    scan: 'read',
    update: 'write'
}

const TransactOps = { delete: 'Delete', get: 'Get', put: 'Put', update: 'Update' }
const BatchOps = { delete: 'DeleteRequest', put: 'PutRequest', update: 'PutRequest' }
const SanityPages = 1000
const FollowThreads = 10

export class Model {

    /*
        @param table Instance of Table.
        @param name Name of the model.
        @param options Hash of options.
     */
    constructor(table, name, options = {}) {
        if (!table) {
            throw new Error('Missing table argument')
        }
        if (!table.typeField || !table.uuid) {
            throw new Error('Invalid table instance')
        }
        if (!name) {
            throw new Error('Missing name of model')
        }
        this.table = table
        this.name = name
        this.options = options

        //  Primary hash and sort attributes and properties
        this.hash = null
        this.sort = null
        this.hashProperty = null
        this.sortProperty = null

        //  Cache table properties
        this.V3 = table.V3
        this.createdField = table.createdField
        this.delimiter = table.delimiter
        this.generic = options.generic
        this.log = table.log.bind(table)
        this.nulls = table.nulls || false
        this.tableName = table.name
        this.typeField = table.typeField
        this.timestamps = options.timestamps
        if (this.timestamps == null) {
            this.timestamps = table.timestamps
        }
        this.updatedField = table.updatedField
        this.indexes = options.indexes || table.indexes
        this.indexProperties = this.getIndexProperties(this.indexes)
        this.block = {fields: {}, deps: []}

        /*
            Map Javascript API properties to DynamoDB attribute names. The schema fields
            map property may contain a '.' like 'obj.prop' to pack multiple properties into a single attribute.

            field.attribute = [attributeName, optional-sub-propertiy]
        */
        this.mappings = {}

        if (options.fields) {
            this.prepModel(options.fields, this.block)
        }
    }

    /*
        Prepare a model based on the schema and compute the attribute mapping.
        Field properties:

        crypt           Boolean
        default         Default value string or function
        enum            Array of values
        filter          Boolean. Prevent a property from being used in a filter
        foreign         model:key-attribute (not yet supported)
        hidden          Boolean. Don't return the attributes to API callers.
        map             String
        nulls           Boolean
        required        Boolean
        size            Number (not implemented)
        transform       Transform hook function
        type            String, Boolean, Number, Date, 'Set', Buffer, Binary, Set, Object, Array
        uuid            true, 'uuid', 'ulid'
        unique          Boolean
        validate        RegExp or "/regexp/qualifier"
        value           String template, function, array
     */
    prepModel(schemaFields, block, prefix = '') {
        let {deps, fields} = block
        schemaFields = Object.assign({}, schemaFields)
        if (!prefix) {
            //  Top level only
            if (!schemaFields[this.typeField]) {
                schemaFields[this.typeField] = { type: String }
            }
            if (this.timestamps) {
                schemaFields[this.createdField] = schemaFields[this.createdField] || { type: Date }
                schemaFields[this.updatedField] = schemaFields[this.updatedField] || { type: Date }
            }
        }
        let {indexes, table} = this
        let primary = indexes.primary

        //  Hold attributes that are mapped to a different attribute
        let mapTargets = {}
        let map = {}

        for (let [name, field] of Object.entries(schemaFields)) {
            let pathname = prefix ? `${prefix}.${name}` : name

            if (!field.type) {
                throw new Error(`Missing field type for ${pathname}`)
            }

            field.pathname = pathname
            field.name = name
            fields[name] = field

            let to = field.map
            if (to) {
                let [att, sub] = to.split('.')
                mapTargets[att] = mapTargets[att] || []
                if (sub) {
                    if (map[pathname] && !Array.isArray(map[pathname])) {
                        throw new Error(`dynamo: Map already defined as literal for ${this.name}.${name}`)
                    }
                    field.attribute = map[pathname] = [att, sub]
                    if (mapTargets[att].indexOf(sub) >= 0) {
                        throw new Error(`Multiple attributes in ${this.pathname} mapped to the target ${to}`)
                    }
                    mapTargets[att].push(sub)
                } else {
                    if (mapTargets[att].length > 1) {
                        throw new Error(`Multiple attributes in ${this.name} mapped to the target ${to}`)
                    }
                    field.attribute = map[pathname] = [att]
                    mapTargets[att].push(true)
                }
            } else {
                field.attribute = map[pathname] = [pathname]
            }
            if (field.nulls !== true && field.nulls !== false) {
                field.nulls = this.nulls
            }
            let index = this.indexProperties[field.attribute[0]]
            if (index && !prefix) {
                field.isIndexed = true
                if (field.attribute.length > 1) {
                    throw new Error(`dynamo: Cannot map property "${pathname}" to a compound attribute "${this.name}.${pathname}"`)
                }
                if (index == 'primary') {
                    field.required = true
                    let attribute = field.attribute[0]
                    if (attribute == primary.hash) {
                        this.hash = attribute
                        this.hashProperty = field.name
                    } else if (attribute == primary.sort) {
                        this.sort = attribute
                        this.sortProperty = field.name
                    }
                }
            }

            if (field.value) {
                //  Value template properties are hidden by default
                if (field.hidden != null) {
                    field.hidden = field.hidden
                } else {
                    field.hidden = table.hidden != null ? table.hidden : true
                }
            }
            if (field.type == Object && field.schema) {
                field.block = {deps: [], fields: {}}
                this.prepModel(field.schema, field.block, name)
            }
        }
        if (!prefix) {
            if (!this.hash || (primary.sort && !this.sort)) {
                throw new Error(`dynamo: Cannot find primary keys for model "${this.name}" in primary index`)
            }
        }
        if (Object.values(fields).find(f => f.unique && f.attribute != this.hash && f.attribute != this.sort)) {
            this.hasUniqueFields = true
        }
        this.mappings = mapTargets

        for (let field of Object.values(fields)) {
            this.orderFields(block, field)
        }
    }

    orderFields(block, field) {
        let {deps, fields} = block
        if (deps.find(i => i.name == field.pathname)) {
            return
        }
        if (field.value) {
            let vars = this.getVars(field.value)
            for (let pathname of vars) {
                let name = pathname.split('.').shift()
                let ref = fields[name]
                if (ref && ref != field && (ref.schema || ref.value)) {
                    this.orderFields(field.block, ref)
                } else {
                    //  Allow ordinary non-field properties
                    // throw new Error(`dynamo: Cannot find value variable "${v}" in field "${field.name}"`)
                }
            }
        }
        deps.push(field)
    }

    /*
    getValue(obj, pathname) {
        for (let prop of pathname.split('.')) {
            if (obj[prop] === undefined) {
                return undefined
            }
            obj = obj[prop]
        }
        return obj
    } */

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

    /*
        Run an operation on DynamodDB. The command has been parsed via Expression.
        Returns [] for find/scan, cmd if !execute, else returns item.
     */
    async run(op, expression) {
        let {index, properties, params} = expression

        /*
            Get a string representation of the API request
         */
        let cmd = expression.command()
        if (!expression.execute) {
            return cmd
        }
        /*
            Transactions save the command in params.transaction and wait for db.transaction() to be called.
         */
        let t = params.transaction
        if (t) {
            let top = TransactOps[op]
            if (top) {
                params.expression = expression
                let items = t.TransactItems = t.TransactItems || []
                return items.push({[top]: cmd})
            } else {
                throw new Error(`Unknown transaction operation ${op}`)
            }
        }
        /*
            Batch operations save the command in params.transaction and wait for db.batchGet|batchWrite to be called.
         */
        let b = params.batch
        if (b) {
            params.expression = expression
            let items = b.RequestItems = b.RequestItems || {}
            if (op == 'get') {
                let list = items[this.tableName] = items[this.tableName] || {Keys: []}
                return list.Keys.push(cmd.Keys)
            } else {
                let list = items[this.tableName] = items[this.tableName] || []
                let bop = BatchOps[op]
                return list.push({[bop]: cmd})
            }
        }
        let stats = params.stats || params.metrics
        if (stats && typeof params == 'object') {
            stats.count = stats.count || 0
            stats.scanned = stats.capacity || 0
            stats.capacity = stats.capacity || 0
        }

        /*
            Run command. Paginate if required.
         */
        let mark = new Date()
        let trace = {cmd, op, properties, params}
        let pages = 0, items = [], result
        let maxPages = params.maxPages ? params.maxPages : SanityPages
        do {
            try {
                this.log('trace', `Dynamo "${op}" "${this.name}"`, {trace}, params)
                if (this.V3) {
                    result = await this.table.client[op](cmd)
                } else {
                    result = await this.table.client[DocumentClientMethods[op]](cmd).promise()
                }

            } catch (err) {
                if (params.throw === false) {
                    result = {}
                } else {
                    trace.err = err
                    this.log('error', `Dynamo exception in "${op}" on "${this.name}"`, {err, trace})
                    throw err
                }
            }
            if (result.LastEvaluatedKey) {
                //  Continue next page
                cmd.ExclusiveStartKey = result.LastEvaluatedKey
            }
            if (result.Items) {
                items = items.concat(result.Items)
                if (stats) {
                    stats.count += result.Count
                    stats.scanned += result.ScannedCount
                    if (result.ConsumedCapacity) {
                        stats.capacity += result.ConsumedCapacity.CapacityUnits
                    }
                }
            } else if (result.Item) {
                items = [result.Item]
                break
            } else if (result.Attributes) {
                items = [result.Attributes]
                break
            }
            if (items.length) {
                if (cmd.Limit) {
                    cmd.Limit -= result.ScannedCount
                    if (cmd.Limit <= 0) {
                        break
                    }
                }
            }
        } while (result.LastEvaluatedKey && (maxPages == null || ++pages < maxPages))

        if (params.parse) {
            items = this.parseResponse(op, expression, items)
        }
        if (params.follow || (index.follow && params.follow !== false)) {
            if (op == 'get') {
                return await this.get(items[0])
            }
            if (op == 'update') {
                properties = Object.assign({}, properties, items[0])
                return await this.update(properties)
            }
            if (op == 'find') {
                let results = [], promises = []
                for (let item of items) {
                    promises.push(this.get(item))
                    if (promises.length > FollowThreads) {
                        results = results.concat(await Promise.all(promises))
                        promises = []
                    }
                }
                if (promises.length) {
                    results = results.concat(await Promise.all(promises))
                }
                return results
            }
        }
        if (params.log !== false) {
            trace.elapsed = (new Date() - mark) / 1000
            trace.items = items
            this.log('data', `Dynamo result for "${op}" "${this.name}"`, {trace}, params)
        }
        if (op == 'find' || op == 'scan') {
            if (result.LastEvaluatedKey) {
                /*
                    More results to come. Create a next() iterator.
                 */
                let params = expression.params
                let properties = expression.properties
                items.start = this.table.unmarshall(result.LastEvaluatedKey)
                items.next = async () => {
                    params = Object.assign({}, params, {start: items.start})
                    if (!params.high) {
                        if (op == 'find') op = 'queryItems'
                        else if (op == 'scan') op = 'scanItems'
                    }
                    return await this[op](properties, params)
                }
            } else {
                items.start = result.LastEvaluatedKey
            }
            return items
        }
        return items[0]
    }

    /*
        Parse the response into Javascript objects for the high level API.
     */
    parseResponse(op, expression, items) {
        let table = this.table
        if (op == 'put') {
            items = [expression.properties]
        } else {
            items = table.unmarshall(items)
        }
        for (let [index, item] of Object.entries(items)) {
            if (expression.params.high && item[this.typeField] != this.name) {
                //  High level API and item for a different model
                continue
            }
            let type = item[this.typeField] ? item[this.typeField] : this.name
            let model = table.models[type] ? table.models[type] : this
            if (model) {
                if (model == table.unique) {
                    //  Special "unique" model for unique fields. Don't return in result.
                    continue
                }
                items[index] = model.transformReadItem(op, item, expression.params)
            }
        }
        return items
    }

    async create(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {parse: true, high: true, exists: false}))
        let result
        if (this.hasUniqueFields) {
            result = await this.createUnique(properties, params)
        } else {
            result = await this.putItem(properties, params)
        }
        return result
    }

    /*
        Create an item with unique attributes. Use a transaction to create a unique item for each
        unique attribute.
     */
    async createUnique(properties, params) {
        let transaction = params.transaction = params.transaction || {}
        let {hash, sort} = this.indexes.primary
        let fields = this.block.fields
        fields = Object.values(fields).filter(f => f.unique && f.attribute != hash && f.attribute != sort)
        for (let field of fields) {
            await this.table.unique.create({pk: `${this.name}:${field.attribute}:${properties[field.name]}`}, {
                transaction,
                exists: false,
                return: 'NONE',
            })
        }
        await this.putItem(properties, params)
        let expression = params.expression
        try {
            await this.table.transact('write', params.transaction, params)
        } catch (err) {
            if (err.message.indexOf('ConditionalCheckFailed') >= 0) {
                throw new Error(`dynamo: Cannot create "${this.name}", an item of the same name already exists.`)
            }
        }
        let items = this.parseResponse('put', expression)
        return items[0]
    }

    async find(properties = {}, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {parse: true, high: true}))
        return await this.queryItems(properties, params)
    }

    async get(properties = {}, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {parse: true, high: true}))

        properties = this.prepareProperties('get', properties, params)
        if (params.fallback) {
            //  Fallback via find
            let items = await this.find(properties, params)
            if (items.length > 1) {
                this.log('info', `Get fallback with more than one result`, {model: this.name, properties, params})
            }
            return items[0]
        }
        let expression = new Expression(this, 'get', properties, params)
        return await this.run('get', expression)
    }

    async remove(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {exists: null, high: true}))

        properties = this.prepareProperties('get', properties, params)
        if (params.fallback) {
            return await this.removeByFind(properties, params)
        }
        let expression = new Expression(this, 'delete', properties, params)
        if (this.hasUniqueFields) {
            await this.removeUnique(properties, params)
        } else {
            await this.run('delete', expression)
        }
    }

    /*
        Remove multiple objects after doing a full find/query
     */
    async removeByFind(properties, params) {
        if (params.retry) {
            throw new Error('dynamo: Remove cannot retry')
        }
        params.parse = true
        let items = await this.find(properties, params)
        if (items.length > 1 && !params.many) {
            throw new Error(`dynamo: warning: removing multiple items from "${this.name}". Use many:true to enable.`)
        }
        for (let item of items) {
            await this.remove(item, {retry: true})
        }
    }

    /*
        Remove an item with unique properties. Use transactions to remove unique items.
     */
    async removeUnique(properties, params) {
        let transaction = params.transaction = params.transaction || {}
        let {hash, sort} = this.indexes.primary
        let fields = this.block.fields
        fields = Object.values(fields).filter(f => f.unique && f.attribute != hash && f.attribute != sort)
        for (let field of fields) {
            await this.table.unique.remove({pk: `${this.name}:${field.attribute}:${properties[field.name]}`}, {transaction})
        }
        await this.deleteItem(properties, params)
        await this.table.transact('write', params.transaction, params)
    }

    async scan(properties = {}, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {parse: true, high: true}))

        properties[this.typeField] = this.name
        return await this.scanItems(properties, params)
    }

    async update(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params, {exists: true, parse: true, high: true}))
        return await this.updateItem(properties, params)
    }

    /*
    async updateByFind(properties, params) {
        if (params.retry) {
            throw new Error(`dynamo: Update retry failed for ${this.name}`, {properties, params})
        }
        let grid = await this.find(properties, params)
        if (grid.length == 0) {
            if (params.throw === false) {
                return null
            } else {
                throw new Error('Cannot find item to update')
            }
        } else if (grid.length > 1) {
            throw new Error('dynamo: cannot update multiple items')
        }
        //  Add primary key to the properties
        properties[this.hashProperty] = grid[0][this.hashProperty]
        properties[this.sortProperty] = grid[0][this.sortProperty]
        return await this.update(properties, {retry: true})
    } */

    //  Low level API

    /* private */
    async deleteItem(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        properties = this.prepareProperties('delete', properties, params)
        let expression = new Expression(this, 'delete', properties, params)
        await this.run('delete', expression)
    }

    /* private */
    async getItem(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        properties = this.prepareProperties('get', properties, params)
        let expression = new Expression(this, 'get', properties, params)
        return await this.run('get', expression)
    }

    /* private */
    async putItem(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        if (!this.generic) {
            properties[this.typeField] = this.name
        }
        if (this.timestamps) {
            properties[this.updatedField] = properties[this.createdField] = new Date()
        }
        properties = this.prepareProperties('put', properties, params)
        let expression = new Expression(this, 'put', properties, params)
        return await this.run('put', expression)
    }

    /* private */
    async queryItems(properties = {}, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        if (!this.generic) {
            properties[this.typeField] = this.name
        }
        properties = this.prepareProperties('find', properties, params)
        let expression = new Expression(this, 'find', properties, params)
        return await this.run('find', expression)
    }

    //  Note: scanItems will return all model types
    /* private */
    async scanItems(properties = {}, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        properties = this.prepareProperties('scan', properties, params)
        let expression = new Expression(this, 'scan', properties, params)
        return await this.run('scan', expression)
    }

    /* private */
    async updateItem(properties, params = {}) {
        ({params, properties} = this.checkArgs(properties, params))
        if (!this.generic) {
            properties[this.typeField] = this.name
        }
        if (this.timestamps) {
            properties[this.updatedField] = new Date()
        }
        properties = this.prepareProperties('update', properties, params)
        /*
        if (params.fallback) {
            //  Fallback for high level invocation via find
            delete properties[this.updatedField]
            return await this.updateByFind(properties, params)
        } */
        let expression = new Expression(this, 'update', properties, params)
        return await this.run('update', expression)
    }

    /*
        Map Dynamo types to Javascript types after reading data
     */
    transformReadItem(op, raw, params) {
        if (!raw) {
            return raw
        }
        let rec = {}
        let fields = this.block.fields

        for (let [name, field] of Object.entries(fields)) {
            if (field.hidden && params.hidden !== true) {
                continue
            }
            let att, sub
            if (op == 'put') {
                att = field.name
            } else {
                [att, sub] = field.attribute
            }
            let value = raw[att]
            if (value == undefined) {
                continue
            }
            if (sub) {
                value = value[sub]
            }
            if (field.crypt) {
                value = this.decrypt(value)
            }
            if (field.default !== undefined && value === undefined) {
                if (typeof field.default == 'function') {
                    value = field.default(this, fieldName, properties)
                } else {
                    value = field.default
                }

            } else if (value === undefined) {
                if (field.required) {
                    this.log('info', `Required field "${name}" in model "${this.name}" not defined in table item`, {
                        model: this.name, raw, params, field
                    })
                }
                continue

            } else {
                rec[name] = this.transformReadAttribute(field, name, value)
            }
        }
        if (typeof params.transform == 'function') {
            rec = params.transform(this, 'read', rec, params, raw)
        }
        if (this.table.intercept && InterceptTags[op] == 'read') {
            rec = this.table.intercept(this, op, rec, params, raw)
        }
        return rec
    }

    transformReadAttribute(field, name, value) {
        if (typeof field.transform == 'function') {
            //  Invoke custom data transform after reading
            return field.transform(this, 'read', name, value)
        }
        if (field.type == Date) {
            return value ? new Date(value) : null
        }
        if (field.type == Buffer || field.type == 'Binary') {
            return new Buffer(value, 'base64')
        }
        return value
    }

    /*
        Validate properties and map types before writing to the database.
        Note: this does not map names to attributes or evaluate value templates, that happens in Expression.
     */
    prepareProperties(op, properties, params) {
        let index
        if (params.index && params.index != 'primary') {
            index = this.indexes[params.index]
            if (!index) {
                throw new Error(`Cannot find index ${params.index}`)
            }
            if (op != 'find' && op != 'scan') {
                if (params.low) {
                    throw new Error('Cannot use non-primary index for "${op}" operation')
                }
                //  Fallback for get/delete as GSIs only support find and scan
                params.fallback = true
                return properties
            }
        } else {
            index = this.indexes.primary
        }
        let project = index.project
        let block = this.block

        //  TODO - need better way of passing these args around
        this.transformProperties(op, block, index, properties, params)

        let rec = {}, hash
        for (let [name, field] of Object.entries(block.fields)) {
            let attribute = field.attribute[0]
            let value = properties[name]
            if (value == null && attribute == index.sort && params.high && (op == 'get' || op == 'delete' /* || op == 'update' */)) {
                //  High level API without sort key. Fallback to find to select the items of interest.
                params.fallback = true
                return properties
            }
            if ((op == 'get' || op == 'delete') && attribute != index.hash && attribute != index.sort) {
                //  Keys only for get and delete
                continue
            }
            if (attribute == index.hash) {
                hash = field.name
            }
            if (project && project != 'all' && Array.isArray(project) && project.indexOf(field.name) < 0) {
                //  Property is not projected
                continue
            }
            if (value !== undefined) {
                rec[name] = this.transformWriteAttribute(field, value)
            }
        }
        if (op != 'scan' && rec[hash] == null) {
            throw new Error(`dynamo: Empty hash key. Check hash key and any value template variable references.`)
        }
        if (typeof params.transform == 'function') {
            rec = params.transform(this, 'write', rec, params)
        }
        if (this.table.intercept && InterceptTags[op] == 'write') {
            rec = this.table.intercept(this, op, rec, params)
        }
        return rec
    }

    //  TODO - need better way of passing these args around
    transformProperties(op, block, index, properties, params) {
        let {deps, fields} = block
        this.addContext(op, fields, index, properties, params)
        if (op == 'put') {
            this.addDefaults(fields, properties, params)
        }
        this.runTemplates(op, index, fields, properties, params)
        this.convertNulls(fields, properties, params)
        if (op == 'put' || op == 'update') {
            this.validateProperties(fields, properties)
        }
        for (let [name, value] of Object.entries(properties)) {
            let field = fields[name]
            if (field && field.schema && typeof value == 'object') {
                this.transformProperties(op, field.block, index, value, params)
            }
        }
    }

    /*
        Add context to properties for key fields and if put, then for all fields.
        Context overrides properties.
     */
    addContext(op, fields, index, properties, params) {
        let context = params.context ? params.context : this.table.context
        for (let field of Object.values(fields)) {
            if (op == 'put' || (field.attribute[0] != index.hash && field.attribute[0] != index.sort)) {
                if (context[field.name] !== undefined) {
                    properties[field.name] = context[field.name]
                }
            }
        }
    }

    addDefaults(fields, properties, params) {
        for (let field of Object.values(fields)) {
            let value = properties[field.name]
            if (value === undefined && !field.value) {
                if (field.default) {
                    if (typeof field.default == 'function') {
                        value = field.default(this, fieldName, properties)
                    } else {
                        value = field.default
                    }
                } else if (field.uuid === true) {
                    value = this.table.makeID()

                } else if (field.uuid == 'uuid') {
                    value = this.table.uuid()

                } else if (field.uuid == 'ulid') {
                    value = this.table.ulid()
                }
                if (value !== undefined) {
                    properties[field.name] = value
                }
            }
        }
    }

    convertNulls(fields, properties, params) {
        for (let [name, value] of Object.entries(properties)) {
            let field = fields[name]
            if (!field) continue
            if (value === null && field.nulls !== true) {
                params.remove = params.remove || []
                params.remove.push(field.pathname)
                delete properties[name]

            } else if (field.type == Object && typeof value == 'object') {
                properties[name] = this.removeEmptyStrings(field, value)
            }
        }
    }
    /*
        Process value templates and property values that are functions
     */
    runTemplates(op, index, fields, properties, params) {
        for (let [name, field] of Object.entries(fields)) {
            if (field.isIndexed && (op != 'put' && op != 'update') &&
                    field.attribute[0] != index.hash && field.attribute[0] != index.sort) {
                //  Ignore indexes not being used for this call
                continue
            }
            if (typeof properties[name] == 'function') {
                properties[name] = properties[name](field.pathname, properties)
            }
            if (properties[name] === undefined && field.value) {
                let value = this.runTemplate(op, index, field, properties, params, field.value)
                if (value != null) {
                    properties[name] = value
                }
            }
        }
    }

    /*
        Expand a value template by substituting ${variable} values from context and properties.
     */
    runTemplate(op, index, field, properties, params, value) {
        value = value.replace(/\${(.*?)}/g, (match, varName) => {
            //  TODO need to handle "." split as well
            let [name, len, pad] = varName.split(':')
            let v = properties[name]
            if (v !== undefined) {
                if (len) {
                    //  Add leading padding for sorting numerics
                    pad = pad || '0'
                    let s = v + ''
                    while (s.length < len) s = pad + s
                    v = s
                }
            } else {
                v = match
            }
            return v
        })
        /*
            Consider unresolved template variables. If field is the sort key and doing find,
            then use sort key prefix and begins_with, (provide no where clause).
         */
        if (value.indexOf('${') >= 0) {
            if (field.attribute[0] == index.sort) {
                if (op == 'find' && !params.where) {
                    value = value.replace(/\${(.*?)}/g, '')
                    let sep = this.delimiter
                    value = value.replace(RegExp(`${sep}${sep}+$`, 'g'), '')
                    if (value) {
                        return {begins: value}
                    }
                }
            }
            /*
                Return undefined if any variables remain undefined. This is critical to stop updating
                templates which do not have all the required properties to complete.
            */
            return undefined
        }
        return value
    }

    validateProperties(fields, properties) {
        let details = {}
        for (let [name, value] of Object.entries(properties)) {
            let field = fields[name]
            if (!field) continue
            if (field.validate || field.enum) {
                value = this.validateProperty(field, value, details)
                properties[name] = value
            }
        }
        for (let field of Object.values(fields)) {
            if (properties[field.name] == null && field.required) {
                details[field.name] = `Value not defined for required field "${field.name}"`
            }
        }
        if (Object.keys(details).length > 0) {
            this.log('info', `Validation error for "${this.name}"`, {model: this.name, properties, details})
            let err = new Error(`dynamo: Validation Error for "${this.name}"`)
            err.details = details
            throw err
        }
    }

    validateProperty(field, value, details) {
        let validate = field.validate
        let fieldName = field.name
        if (validate) {
            if (value === null) {
                if (field.required && field.value == null) {
                    details[fieldName] = `Value not defined for "${fieldName}"`
                }
            } else if (typeof validate == 'function') {
                let error
                ({error, value} = validate(this, field, value))
                if (error) {
                    details[fieldName] = error
                }
            } else if (validate instanceof RegExp) {
                if (!validate.exec(value)) {
                    details[fieldName] = `Bad value \"${value}\" for "${fieldName}"`
                }
            } else {
                let pattern = validate.toString()
                if (pattern[0] == '/' && pattern.lastIndexOf('/') > 0) {
                    let parts = pattern.split('/')
                    let qualifiers = parts.pop()
                    let pat = parts.slice(1).join('/')
                    validate = new RegExp(pat, qualifiers)
                    if (!validate.exec(value)) {
                        details[fieldName] = `Bad value \"${value}\" for "${fieldName}"`
                    }
                } else {
                    if (!value.match(pattern)) {
                        details[fieldName] = `Bad value \"${value}\" for "${fieldName}"`
                    }
                }
            }
        }
        if (field.enum) {
            if (field.enum.indexOf(value) < 0) {
                details[fieldName] = `Bad value \"${value}\" for "${fieldName}"`
            }
        }
        return value
    }

    /*
        Transform types before writing data to Dynamo
     */
    transformWriteAttribute(field, value) {
        if (field.type == Date) {
            value = this.transformWriteDate(value)

        } else if (field.type == Buffer || field.type == 'Binary') {
            if (value instanceof Buffer || value instanceof ArrayBuffer || value instanceof DataView) {
                value = value.toString('base64')
            }
        } else if (field.type == 'Set') {
            if (!Array.isArray(value)) {
                throw new Error('Set value must be an array')
            }
        }
        if (value != null && typeof value == 'object') {
            value = this.transformNestedWriteFields(field, value)
        }
        //  Invoke custom transformation before writing data
        if (field.transform) {
            value = field.transform(this, 'write', field.name, value)
        }
        if (field.crypt) {
            value = this.encrypt(value)
        }
        return value
    }

    transformNestedWriteFields(field, obj) {
        for (let [key, value] of Object.entries(obj)) {
            if (value instanceof Date) {
                obj[key] = this.transformWriteDate(value)

            } else if (value instanceof Buffer || value instanceof ArrayBuffer || value instanceof DataView) {
                value = value.toString('base64')

            } else if (value == null && field.nulls !== true) {
                //  Skip nulls
                continue

            } else if (value != null && typeof value == 'object') {
                obj[key] = this.transformNestedWriteFields(field, value)
            }
        }
        return obj
    }

    transformWriteDate(value) {
        if (this.table.isoDates) {
            if (value instanceof Date) {
                value = value.toISOString()
            } else if (typeof value == 'string') {
                value = (new Date(Date.parse(value))).toISOString()
            } else if (typeof value == 'number') {
                value = (new Date(value)).toISOString()
            }
        } else {
            //  Convert dates to unix epoch
            if (value instanceof Date) {
                value = value.getTime()
            } else if (typeof value == 'string') {
                value = (new Date(Date.parse(value))).getTime()
            }
        }
        return value
    }

    /*
        Get a hash of all the property names of the indexes
     */
    getIndexProperties(indexes) {
        let properties = {}
        for (let [indexName, index] of Object.entries(indexes)) {
            for (let pname of Object.values(index)) {
                properties[pname] = indexName
            }
        }
        return properties
    }

    encrypt(text, name = 'primary', inCode = 'utf8', outCode = 'base64') {
        return this.table.encrypt(text, name, inCode, outCode)
    }

    decrypt(text, inCode = 'base64', outCode = 'utf8') {
        return this.table.decrypt(text, inCode, outCode)
    }

    checkArgs(properties, params, overrides = {}) {
        if (params.checked) {
            return {params, properties}
        }
        if (!properties) {
            throw new Error('Missing properties')
        }
        if (typeof params != 'object') {
            throw new Error('Invalid type for params')
        }
        params = Object.assign(overrides, params)
        params.checked = true
        //  MOB BUG - not copying nested properties
        properties = Object.assign({}, properties)
        return {params, properties}
    }

    removeEmptyStrings(field, obj) {
        let result
        if (obj !== null && typeof obj == 'object') {
            result = Array.isArray(obj) ? [] : {}
            for (let [key, value] of Object.entries(obj)) {
                if (typeof value == 'object') {
                    result[key] = this.removeEmptyStrings(field, value)
                } else if (value == null && field.nulls !== true) {
                    //  Match null and undefined
                    continue
                } else if (value !== '') {
                    result[key] = value
                }
            }
        } else {
            result = obj
        }
        return result
    }
}
