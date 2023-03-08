/*
    Model.js - DynamoDB model class

    A model represents a DynamoDB single-table entity.
*/
import {Expression} from './Expression.js'
import {OneTableError, OneTableArgError} from './Error.js'

/*
    Ready / write tags for interceptions
 */
const ReadWrite = {
    delete: 'write',
    get: 'read',
    find: 'read',
    put: 'write',
    scan: 'read',
    update: 'write',
}

const TransformParseResponseAs = {
    delete: 'get',
    get: 'get',
    find: 'find',
    put: 'get',
    scan: 'scan',
    update: 'get',
}

const KeysOnly = {delete: true, get: true}
const TransactOps = {delete: 'Delete', get: 'Get', put: 'Put', update: 'Update', check: 'ConditionCheck'}
const BatchOps = {delete: 'DeleteRequest', put: 'PutRequest', update: 'PutRequest'}
const ValidTypes = ['array', 'arraybuffer', 'binary', 'boolean', 'buffer', 'date', 'number', 'object', 'set', 'string']
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
            throw new OneTableArgError('Missing table argument')
        }
        if (!table.typeField) {
            throw new OneTableArgError('Invalid table instance')
        }
        if (!name) {
            throw new OneTableArgError('Missing name of model')
        }
        this.table = table
        this.name = name
        this.options = options

        //  Primary hash and sort attributes and properties
        this.hash = null
        this.sort = null

        //  Cache table properties
        this.createdField = table.createdField
        this.generic = options.generic
        this.nested = false
        this.nulls = table.nulls
        this.tableName = table.name
        this.typeField = options.typeField || table.typeField
        this.generic = options.generic != null ? options.generic : table.generic
        this.timestamps = options.timestamps
        if (this.timestamps == null) {
            this.timestamps = table.timestamps
        }
        this.updatedField = table.updatedField
        this.block = {fields: {}, deps: []}

        /*
            Map Javascript API properties to DynamoDB attribute names. The schema fields
            map property may contain a '.' like 'obj.prop' to pack multiple properties into a single attribute.
            field.attribute = [attributeName, optional-sub-propertiy]
        */
        this.mappings = {}

        this.schema = table.schema
        this.indexes = this.schema.indexes

        if (!this.indexes) {
            throw new OneTableArgError('Indexes must be defined on the Table before creating models')
        }
        this.indexProperties = this.getIndexProperties(this.indexes)

        let fields = options.fields || this.schema.definition.models[this.name]
        if (fields) {
            this.prepModel(fields, this.block)
        }
    }

    /*
        Prepare a model based on the schema and compute the attribute mapping.
     */
    prepModel(schemaFields, block, parent) {
        let {fields} = block

        schemaFields = this.table.assign({}, schemaFields)
        if (!parent) {
            //  Top level only
            if (!schemaFields[this.typeField]) {
                schemaFields[this.typeField] = {type: String, hidden: true}
                if (!this.generic) {
                    schemaFields[this.typeField].required = true
                }
            }
            if (this.timestamps === true || this.timestamps == 'create') {
                schemaFields[this.createdField] = schemaFields[this.createdField] || {type: 'date'}
            }
            if (this.timestamps === true || this.timestamps == 'update') {
                schemaFields[this.updatedField] = schemaFields[this.updatedField] || {type: 'date'}
            }
        }
        let {indexes, table} = this
        let primary = indexes.primary

        //  Attributes that are mapped to a different attribute. Indexed by attribute name for this block.
        let mapTargets = {}
        let map = {}

        for (let [name, field] of Object.entries(schemaFields)) {
            if (!field.type) {
                field.type = 'string'
                this.table.log.error(`Missing type field for ${field.name}`, {field})
            }
            //  Propagate parent schema partial overrides
            if (parent && field.partial === undefined && parent.partial !== undefined) {
                field.partial = parent.partial
            }
            field.name = name
            fields[name] = field
            field.isoDates = field.isoDates != null ? field.isoDates : table.isoDates || false

            if (field.uuid) {
                throw new OneTableArgError(
                    'The "uuid" schema property is deprecated. Please use "generate": "uuid or ulid" instead'
                )
            }

            field.type = this.checkType(field)

            /*
                Handle mapped attributes. May be packed also (obj.prop)
            */
            let to = field.map
            if (to) {
                let [att, sub] = to.split('.')
                mapTargets[att] = mapTargets[att] || []
                if (sub) {
                    if (map[name] && !Array.isArray(map[name])) {
                        throw new OneTableArgError(`Map already defined as literal for ${this.name}.${name}`)
                    }
                    field.attribute = map[name] = [att, sub]
                    if (mapTargets[att].indexOf(sub) >= 0) {
                        throw new OneTableArgError(`Multiple attributes in ${field.name} mapped to the target ${to}`)
                    }
                    mapTargets[att].push(sub)
                } else {
                    if (mapTargets[att].length > 1) {
                        throw new OneTableArgError(`Multiple attributes in ${this.name} mapped to the target ${to}`)
                    }
                    field.attribute = map[name] = [att]
                    mapTargets[att].push(true)
                }
            } else {
                field.attribute = map[name] = [name]
            }
            if (field.nulls !== true && field.nulls !== false) {
                field.nulls = this.nulls
            }

            /*
                Handle index requirements
            */
            let index = this.indexProperties[field.attribute[0]]
            if (index && !parent) {
                field.isIndexed = true
                if (field.attribute.length > 1) {
                    throw new OneTableArgError(`Cannot map property "${field.name}" to a compound attribute"`)
                }
                if (index == 'primary') {
                    field.required = true
                    let attribute = field.attribute[0]
                    if (attribute == primary.hash) {
                        this.hash = attribute
                    } else if (attribute == primary.sort) {
                        this.sort = attribute
                    }
                }
            }
            if (field.value) {
                //  Value template properties are hidden by default
                if (field.hidden == null) {
                    field.hidden = true
                }
            }
            /*
                Handle nested schema (recursive)
            */
            if (field.items && field.type == 'array') {
                field.schema = field.items.schema
                field.isArray = true
            }
            if (field.schema) {
                if (field.type == 'object' || field.type == 'array') {
                    field.block = {deps: [], fields: {}}
                    this.prepModel(field.schema, field.block, field)
                    //  FUTURE - better to apply this to the field block
                    this.nested = true
                } else {
                    throw new OneTableArgError(
                        `Nested scheme does not supported "${field.type}" types for field "${field.name}" in model "${this.name}"`
                    )
                }
            }
        }
        if (Object.values(fields).find((f) => f.unique && f.attribute != this.hash && f.attribute != this.sort)) {
            this.hasUniqueFields = true
        }
        this.mappings = mapTargets

        /*
            Order the fields so value templates can depend on each other safely
        */
        for (let field of Object.values(fields)) {
            this.orderFields(block, field)
        }
    }

    checkType(field) {
        let type = field.type
        if (typeof type == 'function') {
            type = type.name
        }
        type = type.toLowerCase()
        if (ValidTypes.indexOf(type) < 0) {
            throw new OneTableArgError(`Unknown type "${type}" for field "${field.name}" in model "${this.name}"`)
        }
        return type
    }

    orderFields(block, field) {
        let {deps, fields} = block
        if (deps.find((i) => i.name == field.name)) {
            return
        }
        if (field.value) {
            let vars = this.table.getVars(field.value)
            for (let path of vars) {
                let name = path.split(/[.[]/g).shift().trim(']')
                let ref = fields[name]
                if (ref && ref != field) {
                    if (ref.schema) {
                        this.orderFields(ref.block, ref)
                    } else if (ref.value) {
                        this.orderFields(block, ref)
                    }
                }
            }
        }
        deps.push(field)
    }

    getPropValue(properties, path) {
        let v = properties
        for (let part of path.split('.')) {
            v = v[part]
        }
        return v
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
            if (params.log !== false) {
                this.table.log[params.log ? 'info' : 'data'](
                    `OneTable command for "${op}" "${this.name} (not executed)"`,
                    {
                        cmd,
                        op,
                        properties,
                        params,
                    }
                )
            }
            return cmd
        }
        /*
            Transactions save the command in params.transaction and wait for db.transaction() to be called.
         */
        let t = params.transaction
        if (t) {
            if (params.batch) {
                throw new OneTableArgError('Cannot have batched transactions')
            }
            let top = TransactOps[op]
            if (top) {
                params.expression = expression
                let items = (t.TransactItems = t.TransactItems || [])
                items.push({[top]: cmd})
                return this.transformReadItem(op, properties, properties, params)
            } else {
                throw new OneTableArgError(`Unknown transaction operation ${op}`)
            }
        }
        /*
            Batch operations save the command in params.transaction and wait for db.batchGet|batchWrite to be called.
         */
        let b = params.batch
        if (b) {
            params.expression = expression
            let ritems = (b.RequestItems = b.RequestItems || {})
            if (op == 'get') {
                let list = (ritems[this.tableName] = ritems[this.tableName] || {Keys: []})
                list.Keys.push(cmd.Keys)
                return this.transformReadItem(op, properties, properties, params)
            } else {
                let list = (ritems[this.tableName] = ritems[this.tableName] || [])
                let bop = BatchOps[op]
                list.push({[bop]: cmd})
                return this.transformReadItem(op, properties, properties, params)
            }
        }
        /*
            Prep the stats
        */
        let stats = params.stats
        if (stats && typeof params == 'object') {
            stats.count = stats.count || 0
            stats.scanned = stats.capacity || 0
            stats.capacity = stats.capacity || 0
        }

        /*
            Run command. Paginate if required.
         */
        let pages = 0,
            items = [],
            count = 0
        let maxPages = params.maxPages ? params.maxPages : SanityPages
        let result
        do {
            result = await this.table.execute(this.name, op, cmd, properties, params)
            if (result.LastEvaluatedKey) {
                //  Continue next page
                cmd.ExclusiveStartKey = result.LastEvaluatedKey
            }
            if (result.Items) {
                items = items.concat(result.Items)
            } else if (result.Item) {
                items = [result.Item]
                break
            } else if (result.Attributes) {
                items = [result.Attributes]
                break
            } else if (params.count || params.select == 'COUNT') {
                count += result.Count
            }
            if (stats) {
                if (result.Count) {
                    stats.count += result.Count
                }
                if (result.ScannedCount) {
                    stats.scanned += result.ScannedCount
                }
                if (result.ConsumedCapacity) {
                    stats.capacity += result.ConsumedCapacity.CapacityUnits
                }
            }
            if (params.progress) {
                params.progress({items, pages, stats, params, cmd})
            }
            if (items.length) {
                if (cmd.Limit) {
                    cmd.Limit -= result.Count
                    if (cmd.Limit <= 0) {
                        break
                    }
                }
            }
        } while (result.LastEvaluatedKey && (maxPages == null || ++pages < maxPages))

        let prev
        if ((op == 'find' || op == 'scan') && items.length) {
            if (items.length) {
                /*
                    Determine next / previous cursors. Note: data items not yet reversed if scanning backwards.
                    Can use LastEvaluatedKey for the direction of scanning. Calculate the other end from the returned items.
                    Next/prev will be swapped when the items are reversed below
                */
                let {hash, sort} = params.index && params.index != 'primary' ? index : this.indexes.primary
                let cursor = {[hash]: items[0][hash], [sort]: items[0][sort]}
                if (cursor[hash] == null || cursor[sort] == null) {
                    cursor = null
                }
                if (params.next || params.prev) {
                    prev = cursor
                    if (cursor && params.index != 'primary') {
                        let {hash, sort} = this.indexes.primary
                        prev[hash] = items[0][hash]
                        prev[sort] = items[0][sort]
                    }
                }
            }
        }

        /*
            Process the response
        */
        if (params.parse) {
            items = this.parseResponse(op, expression, items)
        }

        /*
            Handle pagination next/prev
        */
        if (op == 'find' || op == 'scan') {
            if (result.LastEvaluatedKey) {
                items.next = this.table.unmarshall(result.LastEvaluatedKey, params)
                Object.defineProperty(items, 'next', {enumerable: false})
            }
            if (params.count || params.select == 'COUNT') {
                items.count = count
                Object.defineProperty(items, 'count', {enumerable: false})
            }
            if (prev) {
                items.prev = this.table.unmarshall(prev, params)
                Object.defineProperty(items, 'prev', {enumerable: false})
            }
            if (params.prev && params.next == null && op != 'scan') {
                //  DynamoDB scan ignores ScanIndexForward
                items = items.reverse()
                let tmp = items.prev
                items.prev = items.next
                items.next = tmp
            }
        }

        /*
            Log unless the user provides params.log: false.
            The logger will typically filter data/trace.
        */
        if (params.log !== false) {
            this.table.log[params.log ? 'info' : 'data'](`OneTable result for "${op}" "${this.name}"`, {
                cmd,
                items,
                op,
                properties,
                params,
            })
        }

        /*
            Handle transparent follow. Get/Update/Find the actual item using the keys
            returned from the request on the GSI.
        */
        if (params.follow || (index.follow && params.follow !== false)) {
            if (op == 'get') {
                return await this.get(items[0])
            }
            if (op == 'update') {
                properties = Object.assign({}, properties, items[0])
                return await this.update(properties)
            }
            if (op == 'find') {
                let results = [],
                    promises = []
                params = Object.assign({}, params)
                delete params.follow
                delete params.index
                delete params.fallback
                for (let item of items) {
                    promises.push(this.get(item, params))
                    if (promises.length > FollowThreads) {
                        results = results.concat(await Promise.all(promises))
                        promises = []
                    }
                }
                if (promises.length) {
                    results = results.concat(await Promise.all(promises))
                }
                results.next = items.next
                results.prev = items.prev
                Object.defineProperty(results, 'next', {enumerable: false})
                Object.defineProperty(results, 'prev', {enumerable: false})
                return results
            }
        }
        return op == 'find' || op == 'scan' ? items : items[0]
    }

    /*
        Parse the response into Javascript objects and transform for the high level API.
     */
    parseResponse(op, expression, items) {
        let {properties, params} = expression
        let {schema, table} = this
        if (op == 'put') {
            //  Put requests do not return the item. So use the properties.
            items = [properties]
        } else {
            items = table.unmarshall(items, params)
        }
        for (let [index, item] of Object.entries(items)) {
            if (params.high && params.index == this.indexes.primary && item[this.typeField] != this.name) {
                //  High level API on the primary index and item for a different model
                continue
            }
            let type = item[this.typeField] ? item[this.typeField] : this.name
            let model = schema.models[type] ? schema.models[type] : this
            if (model) {
                if (model == schema.uniqueModel) {
                    //  Special "unique" model for unique fields. Don't return in result.
                    continue
                }
                items[index] = model.transformReadItem(op, item, properties, params)
            }
        }
        return items
    }

    /*
        Create/Put a new item. Will overwrite existing items if exists: null.
    */
    async create(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true, exists: false}))
        let result
        if (this.hasUniqueFields) {
            result = await this.createUnique(properties, params)
        } else {
            result = await this.putItem(properties, params)
        }
        return result
    }

    /*
        Create an item with unique attributes. Use a transaction to create a unique item for each unique attribute.
     */
    async createUnique(properties, params) {
        if (params.batch) {
            throw new OneTableArgError('Cannot use batch with unique properties which require transactions')
        }
        let transactHere = params.transaction ? false : true
        let transaction = (params.transaction = params.transaction || {})
        let {hash, sort} = this.indexes.primary
        let fields = this.block.fields

        fields = Object.values(fields).filter((f) => f.unique && f.attribute != hash && f.attribute != sort)

        let timestamp = (transaction.timestamp = transaction.timestamp || new Date())

        if (params.timestamps !== false) {
            if (this.timestamps === true || this.timestamps == 'create') {
                properties[this.createdField] = timestamp
            }
            if (this.timestamps === true || this.timestamps == 'update') {
                properties[this.updatedField] = timestamp
            }
        }
        params.prepared = properties = this.prepareProperties('put', properties, params)

        for (let field of fields) {
            if (properties[field.name] !== undefined) {
                let scope = ''
                if (field.scope) {
                    scope = this.runTemplate(null, null, field, properties, params, field.scope) + '#'
                }
                let pk = `_unique#${scope}${this.name}#${field.attribute}#${properties[field.name]}`
                let sk = '_unique#'
                await this.schema.uniqueModel.create(
                    {[this.hash]: pk, [this.sort]: sk},
                    {transaction, exists: false, return: 'NONE'}
                )
            }
        }
        let item = await this.putItem(properties, params)

        if (!transactHere) {
            return item
        }
        let expression = params.expression
        try {
            await this.table.transact('write', params.transaction, params)
        } catch (err) {
            if (
                err instanceof OneTableError &&
                err.code === 'TransactionCanceledException' &&
                err.context.err.message.indexOf('ConditionalCheckFailed') !== -1
            ) {
                let names = fields.map((f) => f.name).join(', ')
                throw new OneTableError(
                    `Cannot create unique attributes "${names}" for "${this.name}". An item of the same name already exists.`,
                    {properties, transaction, code: 'UniqueError'}
                )
            }
            throw err
        }
        let items = this.parseResponse('put', expression)
        return items[0]
    }

    async check(properties, params) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true}))
        properties = this.prepareProperties('get', properties, params)
        const expression = new Expression(this, 'check', properties, params)
        this.run('check', expression)
    }

    async find(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true}))
        return await this.queryItems(properties, params)
    }

    async get(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true}))
        properties = this.prepareProperties('get', properties, params)
        if (params.fallback) {
            //  Fallback via find when using non-primary indexes
            params.limit = 2
            let items = await this.find(properties, params)
            if (items.length > 1) {
                throw new OneTableError('Get without sort key returns more than one result', {
                    properties,
                    code: 'NonUniqueError',
                })
            }
            return items[0]
        }
        //  FUTURE refactor to use getItem
        let expression = new Expression(this, 'get', properties, params)
        return await this.run('get', expression)
    }

    async load(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        properties = this.prepareProperties('get', properties, params)
        let expression = new Expression(this, 'get', properties, params)
        return await this.table.batchLoad(expression)
    }

    init(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true}))
        return this.initItem(properties, params)
    }

    async remove(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, exists: null, high: true}))

        properties = this.prepareProperties('delete', properties, params)
        if (params.fallback || params.many) {
            return await this.removeByFind(properties, params)
        }
        let expression = new Expression(this, 'delete', properties, params)
        if (this.hasUniqueFields) {
            return await this.removeUnique(properties, params)
        } else {
            return await this.run('delete', expression)
        }
    }

    /*
        Remove multiple objects after doing a full find/query
     */
    async removeByFind(properties, params) {
        if (params.retry) {
            throw new OneTableArgError('Remove cannot retry', {properties})
        }
        params.parse = true
        let findParams = Object.assign({}, params)
        delete findParams.transaction
        let items = await this.find(properties, findParams)
        if (items.length > 1 && !params.many) {
            throw new OneTableError(`Removing multiple items from "${this.name}". Use many:true to enable.`, {
                properties,
                code: 'NonUniqueError',
            })
        }
        let response = []
        for (let item of items) {
            let removed
            if (this.hasUniqueFields) {
                removed = await this.removeUnique(item, {retry: true, transaction: params.transaction})
            } else {
                removed = await this.remove(item, {retry: true, return: params.return, transaction: params.transaction})
            }
            response.push(removed)
        }
        return response
    }

    /*
        Remove an item with unique properties. Use transactions to remove unique items.
    */
    async removeUnique(properties, params) {
        let transactHere = params.transaction ? false : true
        let transaction = (params.transaction = params.transaction || {})
        let {hash, sort} = this.indexes.primary
        let fields = Object.values(this.block.fields).filter(
            (f) => f.unique && f.attribute != hash && f.attribute != sort
        )

        params.prepared = properties = this.prepareProperties('delete', properties, params)

        let keys = {
            [hash]: properties[hash],
        }
        if (sort) {
            keys[sort] = properties[sort]
        }
        /*
            Get the prior item so we know the previous unique property values so they can be removed.
            This must be run here, even if part of a transaction.
        */
        let prior = await this.get(keys, {hidden: true})
        if (prior) {
            prior = this.prepareProperties('update', prior)
        } else if (params.exists === undefined || params.exists == true) {
            throw new OneTableError('Cannot find existing item to remove', {properties, code: 'NotFoundError'})
        }

        for (let field of fields) {
            let sk = `_unique#`
            let scope = ''
            if (field.scope) {
                scope = this.runTemplate(null, null, field, properties, params, field.scope) + '#'
            }
            // If we had a prior record, remove unique values that existed
            if (prior && prior[field.name]) {
                let pk = `_unique#${scope}${this.name}#${field.attribute}#${prior[field.name]}`
                await this.schema.uniqueModel.remove(
                    {[this.hash]: pk, [this.sort]: sk},
                    {transaction, exists: params.exists}
                )
            } else if (!prior && properties[field.name] !== undefined) {
                // if we did not have a prior record and the field is defined, try to remove it
                let pk = `_unique#${scope}${this.name}#${field.attribute}#${properties[field.name]}`
                await this.schema.uniqueModel.remove(
                    {[this.hash]: pk, [this.sort]: sk},
                    {
                        transaction,
                        exists: params.exists,
                    }
                )
            }
        }
        let removed = await this.deleteItem(properties, params)
        // Only execute transaction if we are not in a transaction
        if (transactHere) {
            removed = await this.table.transact('write', transaction, params)
        }
        return removed
    }

    async scan(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {parse: true, high: true}))
        return await this.scanItems(properties, params)
    }

    async update(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params, {exists: true, parse: true, high: true}))
        if (this.hasUniqueFields) {
            let hasUniqueProperties = Object.entries(properties).find((pair) => {
                return this.block.fields[pair[0]] && this.block.fields[pair[0]].unique
            })
            if (hasUniqueProperties) {
                return await this.updateUnique(properties, params)
            }
        }
        return await this.updateItem(properties, params)
    }

    async upsert(properties, params = {}) {
        params.exists = null
        return await this.update(properties, params)
    }

    /*
        Update an item with unique attributes and actually updating a unique property.
        Use a transaction to update a unique item for each unique attribute.
     */
    async updateUnique(properties, params) {
        if (params.batch) {
            throw new OneTableArgError('Cannot use batch with unique properties which require transactions')
        }
        let transactHere = params.transaction ? false : true
        let transaction = (params.transaction = params.transaction || {})
        let index = this.indexes.primary
        let {hash, sort} = index

        params.prepared = properties = this.prepareProperties('update', properties, params)
        let keys = {
            [index.hash]: properties[index.hash],
        }
        if (index.sort) {
            keys[index.sort] = properties[index.sort]
        }

        /*
            Get the prior item so we know the previous unique property values so they can be removed.
            This must be run here, even if part of a transaction.
        */
        let prior = await this.get(keys, {hidden: true})
        if (prior) {
            prior = this.prepareProperties('update', prior)
        } else if (params.exists === undefined || params.exists == true) {
            throw new OneTableError('Cannot find existing item to update', {properties, code: 'NotFoundError'})
        }
        /*
            Create all required unique properties. Remove prior unique properties if they have changed.
        */
        let fields = Object.values(this.block.fields).filter(
            (f) => f.unique && f.attribute != hash && f.attribute != sort
        )

        for (let field of fields) {
            let toBeRemoved = params.remove && params.remove.includes(field.name)
            let isUnchanged = prior && properties[field.name] === prior[field.name]
            if (isUnchanged) {
                continue
            }

            let scope = ''
            if (field.scope) {
                scope = this.runTemplate(null, null, field, properties, params, field.scope) + '#'
            }
            let pk = `_unique#${scope}${this.name}#${field.attribute}#${properties[field.name]}`
            let sk = `_unique#`
            // If we had a prior value AND value is changing or being removed, remove old value
            if (prior && prior[field.name] && (properties[field.name] !== undefined || toBeRemoved)) {
                /*
                    Remove prior unique properties if they have changed and create new unique property.
                */
                let priorPk = `_unique#${scope}${this.name}#${field.attribute}#${prior[field.name]}`
                if (pk == priorPk) {
                    //  Hasn't changed
                    continue
                }
                await this.schema.uniqueModel.remove(
                    {[this.hash]: priorPk, [this.sort]: sk},
                    {
                        transaction,
                        exists: null,
                        execute: params.execute,
                        log: params.log,
                    }
                )
            }
            // If value is changing, add new unique value
            if (properties[field.name] !== undefined) {
                await this.schema.uniqueModel.create(
                    {[this.hash]: pk, [this.sort]: sk},
                    {
                        transaction,
                        exists: false,
                        return: 'NONE',
                        log: params.log,
                        execute: params.execute,
                    }
                )
            }
        }
        let item = await this.updateItem(properties, params)

        if (!transactHere) {
            return item
        }

        /*
            Perform all operations in a transaction so update will only be applied if the unique properties can be created.
        */
        try {
            await this.table.transact('write', params.transaction, params)
        } catch (err) {
            if (
                err instanceof OneTableError &&
                err.code === 'TransactionCanceledException' &&
                err.context.err.message.indexOf('ConditionalCheckFailed') !== -1
            ) {
                let names = fields.map((f) => f.name).join(', ')
                throw new OneTableError(
                    `Cannot update unique attributes "${names}" for "${this.name}". An item of the same name already exists.`,
                    {properties, transaction, code: 'UniqueError'}
                )
            }
            throw err
        }
        if (params.return == 'none' || params.return == 'NONE' || params.return === false) {
            return
        }
        if (params.return == 'get') {
            return await this.get(keys, {
                hidden: params.hidden,
                log: params.log,
                parse: params.parse,
                execute: params.execute,
            })
        }
        if (this.table.warn !== false) {
            console.warn(
                `Update with unique items uses transactions and cannot return the updated item.` +
                    `Use params {return: 'none'} to squelch this warning. ` +
                    `Use {return: 'get'} to do a non-transactional get of the item after the update. `
            )
        }
    }

    //  Low level API

    /* private */
    async deleteItem(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        if (!params.prepared) {
            properties = this.prepareProperties('delete', properties, params)
        }
        let expression = new Expression(this, 'delete', properties, params)
        return await this.run('delete', expression)
    }

    /* private */
    async getItem(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        properties = this.prepareProperties('get', properties, params)
        let expression = new Expression(this, 'get', properties, params)
        return await this.run('get', expression)
    }

    /* private */
    initItem(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        let fields = this.block.fields
        this.setDefaults('init', fields, properties, params)
        //  Ensure all fields are present
        for (let key of Object.keys(fields)) {
            if (properties[key] === undefined) {
                properties[key] = null
            }
        }
        this.runTemplates('put', '', this.indexes.primary, this.block.deps, properties, params)
        return properties
    }

    /* private */
    async putItem(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        if (!params.prepared) {
            if (params.timestamps !== false) {
                let timestamp = params.transaction
                    ? (params.transaction.timestamp = params.transaction.timestamp || new Date())
                    : new Date()

                if (this.timestamps === true || this.timestamps == 'create') {
                    properties[this.createdField] = timestamp
                }
                if (this.timestamps === true || this.timestamps == 'update') {
                    properties[this.updatedField] = timestamp
                }
            }
            properties = this.prepareProperties('put', properties, params)
        }
        let expression = new Expression(this, 'put', properties, params)
        return await this.run('put', expression)
    }

    /* private */
    async queryItems(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        properties = this.prepareProperties('find', properties, params)
        let expression = new Expression(this, 'find', properties, params)
        return await this.run('find', expression)
    }

    //  Note: scanItems will return all model types
    /* private */
    async scanItems(properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        properties = this.prepareProperties('scan', properties, params)
        let expression = new Expression(this, 'scan', properties, params)
        return await this.run('scan', expression)
    }

    /* private */
    async updateItem(properties, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        if (this.timestamps === true || this.timestamps == 'update') {
            if (params.timestamps !== false) {
                let timestamp = params.transaction
                    ? (params.transaction.timestamp = params.transaction.timestamp || new Date())
                    : new Date()
                properties[this.updatedField] = timestamp
                if (params.exists == null) {
                    let field = this.block.fields[this.createdField] || this.table
                    let when = field.isoDates ? timestamp.toISOString() : timestamp.getTime()
                    params.set = params.set || {}
                    params.set[this.createdField] = `if_not_exists(\${${this.createdField}}, {${when}})`
                }
            }
        }
        properties = this.prepareProperties('update', properties, params)
        let expression = new Expression(this, 'update', properties, params)
        return await this.run('update', expression)
    }

    /* private */
    async fetch(models, properties = {}, params = {}) {
        /* eslint-disable-next-line */
        ;({properties, params} = this.checkArgs(properties, params))
        if (models.length == 0) {
            return {}
        }
        let where = []
        for (let model of models) {
            where.push(`\${${this.typeField}} = {${model}}`)
        }
        if (params.where) {
            params.where = `(${params.where}) and (${where.join(' or ')})`
        } else {
            params.where = where.join(' or ')
        }
        params.parse = true
        params.hidden = true

        let items = await this.queryItems(properties, params)
        return this.table.groupByType(items)
    }

    /*
        Map Dynamo types to Javascript types after reading data
     */
    transformReadItem(op, raw, properties, params) {
        if (!raw) {
            return raw
        }
        return this.transformReadBlock(op, raw, properties, params, this.block.fields)
    }

    transformReadBlock(op, raw, properties, params, fields) {
        let rec = {}
        for (let [name, field] of Object.entries(fields)) {
            //  Skip hidden params. Follow needs hidden params to do the follow.
            if (field.hidden && params.follow !== true) {
                if (params.hidden === false || (params.hidden == null && this.table.hidden === false)) {
                    continue
                }
            }
            let att, sub
            if (op == 'put') {
                att = field.name
            } else {
                /* eslint-disable-next-line */
                ;[att, sub] = field.attribute
            }
            let value = raw[att]
            if (value === undefined) {
                if (field.encode) {
                    let [att, sep, index] = field.encode
                    value = (raw[att] || '').split(sep)[index]
                }
                if (value === undefined) {
                    continue
                }
            }
            if (sub) {
                value = value[sub]
            }
            if (field.crypt && params.decrypt !== false) {
                value = this.decrypt(value)
            }
            if (field.default !== undefined && value === undefined) {
                value = field.default
            } else if (value === undefined) {
                if (field.required) {
                    this.table.log.error(`Required field "${name}" in model "${this.name}" not defined in table item`, {
                        model: this.name,
                        raw,
                        params,
                        field,
                    })
                }
            } else if (field.schema && value !== null && typeof value == 'object') {
                if (field.items && Array.isArray(value)) {
                    rec[name] = []
                    let i = 0
                    for (let rvalue of raw[att]) {
                        rec[name][i] = this.transformReadBlock(
                            op,
                            rvalue,
                            properties[name] || [],
                            params,
                            field.block.fields
                        )
                        i++
                    }
                } else {
                    rec[name] = this.transformReadBlock(
                        op,
                        raw[att],
                        properties[name] || {},
                        params,
                        field.block.fields
                    )
                }
            } else {
                rec[name] = this.transformReadAttribute(field, name, value, params, properties)
            }
        }
        if (this.generic) {
            //  Generic must include attributes outside the schema.
            for (let [name, value] of Object.entries(raw)) {
                if (rec[name] === undefined) {
                    rec[name] = value
                }
            }
        }
        if (
            params.hidden == true &&
            rec[this.typeField] === undefined &&
            !this.generic &&
            this.block.fields == fields
        ) {
            rec[this.typeField] = this.name
        }
        if (this.table.params.transform) {
            let opForTransform = TransformParseResponseAs[op]
            rec = this.table.params.transform(this, ReadWrite[opForTransform], rec, properties, params, raw)
        }
        return rec
    }

    transformReadAttribute(field, name, value, params, properties) {
        if (typeof params.transform == 'function') {
            //  Invoke custom data transform after reading
            return params.transform(this, 'read', name, value, properties)
        }
        if (field.type == 'date' && value != undefined) {
            if (field.ttl) {
                //  Parse incase stored as ISO string
                return new Date(new Date(value).getTime() * 1000)
            } else {
                return new Date(value)
            }
        }
        if (field.type == 'buffer' || field.type == 'arraybuffer' || field.type == 'binary') {
            return Buffer.from(value, 'base64')
        }
        return value
    }

    /*
        Validate properties and map types if required.
        Note: this does not map names to attributes or evaluate value templates, that happens in Expression.
     */
    prepareProperties(op, properties, params = {}) {
        delete params.fallback
        let index = this.selectIndex(op, params)

        if (this.needsFallback(op, index, params)) {
            params.fallback = true
            return properties
        }
        //  DEPRECATE
        this.tunnelProperties(properties, params)

        if (params.filter) {
            this.convertFilter(properties, params, index)
        }
        let rec = this.collectProperties(op, '', this.block, index, properties, params)
        if (params.fallback) {
            return properties
        }
        if (op != 'scan' && this.getHash(rec, this.block.fields, index, params) == null) {
            this.table.log.error(`Empty hash key`, {properties, params, op, rec, index, model: this.name})
            throw new OneTableError(`Empty hash key. Check hash key and any value template variable references.`, {
                properties,
                rec,
                code: 'MissingError',
            })
        }
        if (this.table.params.transform && ReadWrite[op] == 'write') {
            rec = this.table.params.transform(this, ReadWrite[op], rec, properties, params)
        }
        return rec
    }

    /*
        Convert a full text params.filter into a smart params.where
        NOTE: this is prototype code and definitely not perfect! Use at own risk.
     */
    convertFilter(properties, params, index) {
        let filter = params.filter
        let fields = this.block.fields
        let where
        //  TODO support > >= < <= ..., AND or ...
        let [name, value] = filter.split('=')
        if (value) {
            name = name.trim()
            value = value.trim()
            let field = fields[name]
            if (field) {
                name = field.map ? field.map : name
                if (field.encode) {
                    properties[name] = value
                } else {
                    where = `\${${name}} = {${value}}`
                }
            } else {
                //  TODO support > >= < <= ..., AND or ...
                where = `\${${name}} = {${value}}`
            }
        } else {
            value = name
            where = []
            for (let [name, field] of Object.entries(fields)) {
                let primary = this.indexes.primary
                if (primary.hash == name || primary.sort == name || index.hash == name || index.sort == name) {
                    continue
                }
                if (field.encode) {
                    continue
                }
                name = field.map ? field.map : name
                let term = `(contains(\${${name}}, {${filter}}))`
                where.push(term)
            }
            if (where) {
                where = where.join(' or ')
            }
        }
        params.where = where
        //  TODO SANITY
        params.maxPages = 25
    }

    //  Handle fallback for get/delete as GSIs only support find and scan
    needsFallback(op, index, params) {
        if (index != this.indexes.primary && op != 'find' && op != 'scan') {
            if (params.low) {
                throw new OneTableArgError('Cannot use non-primary index for "${op}" operation')
            }
            return true
        }
        return false
    }

    /*
        Return the hash property name for the selected index.
    */
    getHash(rec, fields, index, params) {
        let generic = params.generic != null ? params.generic : this.generic
        if (generic) {
            return rec[index.hash]
        }
        let field = Object.values(fields).find((f) => f.attribute[0] == index.hash)
        if (!field) {
            return null
        }
        return rec[field.name]
    }

    /*
        Get the index for the request
    */
    selectIndex(op, params) {
        let index
        if (params.index && params.index != 'primary') {
            index = this.indexes[params.index]
            if (!index) {
                throw new OneTableError(`Cannot find index ${params.index}`, {code: 'MissingError'})
            }
        } else {
            index = this.indexes.primary
        }
        return index
    }

    /*
        Collect the required attribute from the properties and context.
        This handles tunneled properties, blends context properties, resolves default values,
        handles Nulls and empty strings, and invokes validations. Nested schemas are handled here.

        NOTE: pathname is only needed for DEPRECATED and undocumented callbacks.
    */
    collectProperties(op, pathname, block, index, properties, params, context, rec = {}) {
        let fields = block.fields
        if (!context) {
            context = params.context || this.table.context
        }
        /*
            First process nested schemas recursively
        */
        if (this.nested && !KeysOnly[op]) {
            this.collectNested(op, pathname, fields, index, properties, params, context, rec)
        }
        /*
            Then process the non-schema properties at this level (non-recursive)
        */
        this.addContext(op, fields, index, properties, params, context)
        this.setDefaults(op, fields, properties, params)
        this.runTemplates(op, pathname, index, block.deps, properties, params)
        this.convertNulls(op, pathname, fields, properties, params)
        this.validateProperties(op, fields, properties, params)
        this.selectProperties(op, block, index, properties, params, rec)
        this.transformProperties(op, fields, properties, params, rec)
        return rec
    }

    /*
        Process nested schema recursively
    */
    collectNested(op, pathname, fields, index, properties, params, context, rec) {
        for (let field of Object.values(fields)) {
            let schema = field.schema || field?.items?.schema
            if (schema) {
                let name = field.name
                let value = properties[name]
                if (op == 'put' && value === undefined) {
                    value = field.required ? (field.type == 'array' ? [] : {}) : field.default
                }
                let ctx = context[name] || {}
                let partial = this.getPartial(field, params)

                if (value === null && field.nulls === true) {
                    rec[name] = null
                } else if (value !== undefined) {
                    if (field.items && Array.isArray(value)) {
                        rec[name] = []
                        let i = 0
                        for (let rvalue of value) {
                            let path = pathname ? `${pathname}.${name}[${i}]` : `${name}[${i}]`
                            let obj = this.collectProperties(op, path, field.block, index, rvalue, params, ctx)
                            //  Don't update properties if empty and partial and no default
                            if (!partial || Object.keys(obj).length > 0 || field.default !== undefined) {
                                rec[name][i++] = obj
                            }
                        }
                    } else {
                        let path = pathname ? `${pathname}.${field.name}` : field.name
                        let obj = this.collectProperties(op, path, field.block, index, value, params, ctx)
                        if (!partial || Object.keys(obj).length > 0 || field.default !== undefined) {
                            rec[name] = obj
                        }
                    }
                }
            }
        }
    }

    /*
        DEPRECATE - not needed anymore
    */
    tunnelProperties(properties, params) {
        if (params.tunnel) {
            if (this.table.warn !== false) {
                console.warn(
                    'WARNING: tunnel properties should not be required for typescript and will be removed soon.'
                )
            }
            for (let [kind, settings] of Object.entries(params.tunnel)) {
                for (let [key, value] of Object.entries(settings)) {
                    properties[key] = {[kind]: value}
                }
            }
        }
    }

    /*
        Select the attributes to include in the request
    */
    selectProperties(op, block, index, properties, params, rec) {
        let project = this.getProjection(index)
        /*
            NOTE: Value templates for unique items may need other properties when removing unique items
        */
        for (let [name, field] of Object.entries(block.fields)) {
            if (field.schema) continue
            let omit = false

            if (block == this.block) {
                let attribute = field.attribute[0]
                //  Missing sort key on a high-level API for get/delete
                if (properties[name] == null && attribute == index.sort && params.high && KeysOnly[op]) {
                    if (op == 'delete' && !params.many) {
                        throw new OneTableError('Missing sort key', {code: 'MissingError', properties, params})
                    }
                    /*
                        Missing sort key for high level get, or delete without "any".
                        Fallback to find to select the items of interest. Get will throw if more than one result is returned.
                    */
                    params.fallback = true
                    return
                }
                if (KeysOnly[op] && attribute != index.hash && attribute != index.sort && !this.hasUniqueFields) {
                    //  Keys only for get and delete. Must include unique properties and all properties if unique value templates.
                    //  FUTURE: could have a "strict" mode where we warn for other properties instead of ignoring.
                    omit = true
                } else if (project && project.indexOf(attribute) < 0) {
                    //  Attribute is not projected
                    omit = true
                } else if (name == this.typeField && name != index.hash && name != index.sort && op == 'find') {
                    omit = true
                } else if (field.encode) {
                    omit = true
                }
            }
            if (!omit && properties[name] !== undefined) {
                rec[name] = properties[name]
            }
        }
        if (block == this.block) {
            //  Only do at top level
            this.addProjectedProperties(op, properties, params, project, rec)
        }
    }

    getProjection(index) {
        let project = index.project
        if (project) {
            if (project == 'all') {
                project = null
            } else if (project == 'keys') {
                let primary = this.indexes.primary
                project = [primary.hash, primary.sort, index.hash, index.sort]
                project = project.filter((v, i, a) => a.indexOf(v) === i)
            } else if (Array.isArray(project)) {
                let primary = this.indexes.primary
                project = project.concat([primary.hash, primary.sort, index.hash, index.sort])
                project = project.filter((v, i, a) => a.indexOf(v) === i)
            }
        }
        return project
    }

    //  For generic (table low level APIs), add all properties that are projected
    addProjectedProperties(op, properties, params, project, rec) {
        let generic = params.generic != null ? params.generic : this.generic
        if (generic && !KeysOnly[op]) {
            for (let [name, value] of Object.entries(properties)) {
                if (project && project.indexOf(name) < 0) {
                    continue
                }
                if (rec[name] === undefined) {
                    //  Cannot do all type transformations - don't have enough info without fields
                    if (value instanceof Date) {
                        if (this.isoDates) {
                            rec[name] = value.toISOString()
                        } else {
                            rec[name] = value.getTime()
                        }
                    } else {
                        rec[name] = value
                    }
                }
            }
        }
        return rec
    }

    /*
        Add context to properties. If 'put', then for all fields, otherwise just key fields.
        Context overrides properties.
     */
    addContext(op, fields, index, properties, params, context) {
        for (let field of Object.values(fields)) {
            if (field.schema) continue
            if (op == 'put' || (field.attribute[0] != index.hash && field.attribute[0] != index.sort)) {
                if (context[field.name] !== undefined) {
                    properties[field.name] = context[field.name]
                }
            }
        }
        if (!this.generic && fields == this.block.fields) {
            //  Set type field for the top level only
            properties[this.typeField] = this.name
        }
    }

    /*
        Set default property values on Put.
    */
    setDefaults(op, fields, properties, params) {
        if (op != 'put' && op != 'init' && !(op == 'update' && params.exists == null)) {
            return
        }
        for (let field of Object.values(fields)) {
            if (field.schema) continue
            let value = properties[field.name]

            //  Set defaults and uuid fields
            if (value === undefined && !field.value) {
                if (field.default !== undefined) {
                    value = field.default
                } else if (op == 'init') {
                    if (!field.generate) {
                        //  Set non-default, non-uuid properties to null
                        value = null
                    }
                } else if (field.generate) {
                    let generate = field.generate
                    if (generate === true) {
                        value = this.table.generate()
                    } else if (generate == 'uuid') {
                        value = this.table.uuid()
                    } else if (generate == 'ulid') {
                        value = this.table.ulid()
                    } else if (generate == 'uid') {
                        value = this.table.uid(10)
                    } else if (generate.indexOf('uid') == 0) {
                        let [, size] = generate.split('(')
                        value = this.table.uid(parseInt(size) || 10)
                    }
                }
                if (value !== undefined) {
                    properties[field.name] = value
                }
            }
        }
        return properties
    }

    /*
        Remove null properties from the table unless Table.nulls == true
        TODO - null conversion would be better done in Expression then pathnames would not be needed.
        NOTE: pathname is only needed for DEPRECATED callbacks.
    */
    convertNulls(op, pathname, fields, properties, params) {
        for (let [name, value] of Object.entries(properties)) {
            let field = fields[name]
            if (!field || field.schema) continue
            if (value === null && field.nulls !== true) {
                //  create with null/undefined, or update with null property
                if (
                    field.required &&
                    ((op == 'put' && properties[field.name] == null) ||
                        (op == 'update' && properties[field.name] === null))
                ) {
                    //  Validation will catch this
                    continue
                }
                delete properties[name]
                if (this.getPartial(field, params) === false && pathname.match(/[[.]/)) {
                    /*
                        Partial disabled for a nested object 
                        Don't create remove entry as the entire object is being created/updated
                     */
                    continue
                }
                if (params.remove && !Array.isArray(params.remove)) {
                    params.remove = [params.remove]
                } else {
                    params.remove = params.remove || []
                }
                let path = pathname ? `${pathname}.${field.name}` : field.name
                params.remove.push(path)
            } else if (typeof value == 'object' && (field.type == 'object' || field.type == 'array')) {
                //  Remove nested empty strings because DynamoDB cannot handle these nested in objects or arrays
                properties[name] = this.handleEmpties(field, value)
            }
        }
    }

    /*
        Process value templates and property values that are functions
     */
    runTemplates(op, pathname, index, deps, properties, params) {
        for (let field of deps) {
            if (field.schema) continue
            let name = field.name
            if (
                field.isIndexed &&
                op != 'put' &&
                op != 'update' &&
                field.attribute[0] != index.hash &&
                field.attribute[0] != index.sort
            ) {
                //  Ignore indexes not being used for this call
                continue
            }
            let path = pathname ? `${pathname}.${field.name}` : field.name

            if (field.value === true && typeof this.table.params.value == 'function') {
                properties[name] = this.table.params.value(this, path, properties, params)
            } else if (properties[name] === undefined) {
                if (field.value) {
                    let value = this.runTemplate(op, index, field, properties, params, field.value)
                    if (value != null) {
                        properties[name] = value
                    }
                }
            }
        }
    }

    /*
        Expand a value template by substituting ${variable} values from context and properties.
     */
    runTemplate(op, index, field, properties, params, value) {
        /*
            Replace property references in ${var}
            Support ${var:length:pad-character} which is useful for sorting.
        */
        value = value.replace(/\${(.*?)}/g, (match, varName) => {
            let [name, len, pad] = varName.split(':')
            let v = this.getPropValue(properties, name)
            if (v != null) {
                if (v instanceof Date) {
                    v = this.transformWriteDate(field, v)
                }
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
            if (typeof v == 'object' && v.toString() == '[object Object]') {
                throw new OneTableError(`Value for "${field.name}" is not a primitive value`, {code: 'TypeError'})
            }
            return v
        })

        /*
            Consider unresolved template variables. If field is the sort key and doing find,
            then use sort key prefix and begins_with, (provide no where clause).
         */
        if (value.indexOf('${') >= 0 && index) {
            if (field.attribute[0] == index.sort) {
                if (op == 'find') {
                    //  Strip from first ${ onward and retain fixed prefix portion
                    value = value.replace(/\${.*/g, '')
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

    //  Public routine to run templates
    template(name, properties, params = {}) {
        let fields = this.block.fields
        let field = fields[name]
        if (!field) {
            throw new OneTableError('Cannot find field', {name})
        }
        return this.runTemplate('find', null, field, properties, params, field.value)
    }

    validateProperties(op, fields, properties, params) {
        if (op != 'put' && op != 'update') {
            return
        }
        let validation = {}
        if (typeof this.table.params.validate == 'function') {
            validation = this.table.params.validate(this, properties, params) || {}
        }
        for (let [name, value] of Object.entries(properties)) {
            let field = fields[name]
            if (!field || field.schema) continue
            if (params.validate || field.validate || field.enum) {
                value = this.validateProperty(field, value, validation, params)
                properties[name] = value
            }
        }
        for (let field of Object.values(fields)) {
            //  If required and create, must be defined. If required and update, must not be null.
            if (
                field.required &&
                !field.schema &&
                ((op == 'put' && properties[field.name] == null) || (op == 'update' && properties[field.name] === null))
            ) {
                validation[field.name] = `Value not defined for required field "${field.name}"`
            }
        }

        if (Object.keys(validation).length > 0) {
            throw new OneTableError(`Validation Error in "${this.name}" for "${Object.keys(validation).join(', ')}"`, {
                validation,
                code: 'ValidationError',
                properties,
            })
        }
    }

    validateProperty(field, value, details, params) {
        let fieldName = field.name

        if (typeof params.validate == 'function') {
            let error
            ;({error, value} = params.validate(this, field, value))
            if (error) {
                details[fieldName] = error
            }
        }
        let validate = field.validate
        if (validate) {
            if (value === null) {
                if (field.required && field.value == null) {
                    details[fieldName] = `Value not defined for "${fieldName}"`
                }
            } else if (validate instanceof RegExp) {
                if (!validate.exec(value)) {
                    details[fieldName] = `Bad value "${value}" for "${fieldName}"`
                }
            } else {
                let pattern = validate.toString()
                if (pattern[0] == '/' && pattern.lastIndexOf('/') > 0) {
                    let parts = pattern.split('/')
                    let qualifiers = parts.pop()
                    let pat = parts.slice(1).join('/')
                    validate = new RegExp(pat, qualifiers)
                    if (!validate.exec(value)) {
                        details[fieldName] = `Bad value "${value}" for "${fieldName}"`
                    }
                } else {
                    if (!value.match(pattern)) {
                        details[fieldName] = `Bad value "${value}" for "${fieldName}"`
                    }
                }
            }
        }
        if (field.enum) {
            if (field.enum.indexOf(value) < 0) {
                details[fieldName] = `Bad value "${value}" for "${fieldName}"`
            }
        }
        return value
    }

    transformProperties(op, fields, properties, params, rec) {
        for (let [name, field] of Object.entries(fields)) {
            //  Nested schemas handled via collectProperties
            if (field.schema) continue
            let value = rec[name]
            if (value !== undefined) {
                rec[name] = this.transformWriteAttribute(op, field, value, properties, params)
            }
        }
        return rec
    }

    /*
        Transform an attribute before writing. This invokes transform callbacks and handles nested objects.
     */
    transformWriteAttribute(op, field, value, properties, params) {
        let type = field.type

        if (typeof params.transform == 'function') {
            value = params.transform(this, 'write', field.name, value, properties, null)
        } else if (value == null && field.nulls === true) {
            //  Keep the null
        } else if (op == 'find' && value != null && typeof value == 'object') {
            //  Find used {begins} for sort keys and other operators
            value = this.transformNestedWriteFields(field, value)
        } else if (type == 'date') {
            value = this.transformWriteDate(field, value)
        } else if (type == 'number') {
            let num = Number(value)
            if (isNaN(num)) {
                throw new OneTableError(`Invalid value "${value}" provided for field "${field.name}"`, {
                    code: 'ValidationError',
                })
            }
            value = num
        } else if (type == 'boolean') {
            if (value == 'false' || value == 'null' || value == 'undefined') {
                value = false
            }
            value = Boolean(value)
        } else if (type == 'string') {
            if (value != null) {
                value = value.toString()
            }
        } else if (type == 'buffer' || type == 'arraybuffer' || type == 'binary') {
            if (value instanceof Buffer || value instanceof ArrayBuffer || value instanceof DataView) {
                value = value.toString('base64')
            }
        } else if (type == 'array') {
            if (value != null) {
                if (Array.isArray(value)) {
                    value = this.transformNestedWriteFields(field, value)
                } else {
                    //  Heursistics to accept legacy string values for array types. Note: TS would catch this also.
                    if (value == '') {
                        value = []
                    } else {
                        //  FUTURE: should be moved to validations
                        throw new OneTableArgError(
                            `Invalid data type for Array field "${field.name}" in "${this.name}"`
                        )
                    }
                }
            }
        } else if (type == 'set' && Array.isArray(value)) {
            value = this.transformWriteSet(type, value)
        } else if (type == 'object' && value != null && typeof value == 'object') {
            value = this.transformNestedWriteFields(field, value)
        }

        if (field.crypt && value != null) {
            value = this.encrypt(value)
        }
        return value
    }

    transformNestedWriteFields(field, obj) {
        for (let [key, value] of Object.entries(obj)) {
            let type = field.type
            if (value instanceof Date) {
                obj[key] = this.transformWriteDate(field, value)
            } else if (value instanceof Buffer || value instanceof ArrayBuffer || value instanceof DataView) {
                value = value.toString('base64')
            } else if (Array.isArray(value) && (field.type == Set || type == Set)) {
                value = this.transformWriteSet(type, value)
            } else if (value == null && field.nulls !== true) {
                //  Skip nulls
                continue
            } else if (value != null && typeof value == 'object') {
                obj[key] = this.transformNestedWriteFields(field, value)
            }
        }
        return obj
    }

    transformWriteSet(type, value) {
        if (!Array.isArray(value)) {
            throw new OneTableError('Set values must be arrays', {code: 'TypeError'})
        }
        if (type == Set || type == 'Set' || type == 'set') {
            let v = value.values().next().value
            if (typeof v == 'string') {
                value = value.map((v) => v.toString())
            } else if (typeof v == 'number') {
                value = value.map((v) => Number(v))
            } else if (v instanceof Buffer || v instanceof ArrayBuffer || v instanceof DataView) {
                value = value.map((v) => v.toString('base64'))
            }
        } else {
            throw new OneTableError('Unknown type', {code: 'TypeError'})
        }
        return value
    }

    /*
        Handle dates. Supports epoch and ISO date transformations.
    */
    transformWriteDate(field, value) {
        let isoDates = field.isoDates || this.table.isoDates
        if (field.ttl) {
            //  Convert dates to DynamoDB TTL
            if (value instanceof Date) {
                value = value.getTime()
            } else if (typeof value == 'string') {
                value = new Date(Date.parse(value)).getTime()
            }
            value = Math.ceil(value / 1000)
        } else if (isoDates) {
            if (value instanceof Date) {
                value = value.toISOString()
            } else if (typeof value == 'string') {
                value = new Date(Date.parse(value)).toISOString()
            } else if (typeof value == 'number') {
                value = new Date(value).toISOString()
            }
        } else {
            //  Convert dates to unix epoch in milliseconds
            if (value instanceof Date) {
                value = value.getTime()
            } else if (typeof value == 'string') {
                value = new Date(Date.parse(value)).getTime()
            }
        }
        return value
    }

    /*
        Get a hash of all the property names of the indexes. Keys are properties, values are index names.
        Primary takes precedence if property used in multiple indexes (LSIs)
     */
    getIndexProperties(indexes) {
        let properties = {}
        for (let [indexName, index] of Object.entries(indexes)) {
            for (let [type, pname] of Object.entries(index)) {
                if (type == 'hash' || type == 'sort') {
                    if (properties[pname] != 'primary') {
                        //  Let primary take precedence
                        properties[pname] = indexName
                    }
                }
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

    /*
        Clone properties and params to callers objects are not polluted
    */
    checkArgs(properties, params, overrides = {}) {
        if (params.checked) {
            //  Only need to clone once
            return {properties, params}
        }
        if (!properties) {
            throw new OneTableArgError('Missing properties')
        }
        if (typeof params != 'object') {
            throw new OneTableError('Invalid type for params', {code: 'TypeError'})
        }
        //  Must not use merge as we need to modify the callers batch/transaction objects
        params = Object.assign(overrides, params)

        params.checked = true
        properties = this.table.assign({}, properties)
        return {properties, params}
    }

    /*
        Handle nulls and empty strings properly according to nulls preference in plain objects and arrays.
        NOTE: DynamoDB can handle empty strings as top level non-key string attributes, but not nested in lists or maps. Ugh!
    */
    handleEmpties(field, obj) {
        let result
        if (
            obj !== null &&
            typeof obj == 'object' &&
            (obj.constructor.name == 'Object' || obj.constructor.name == 'Array')
        ) {
            result = Array.isArray(obj) ? [] : {}
            for (let [key, value] of Object.entries(obj)) {
                if (value === '') {
                    //  Convert to null and handle according to field.nulls
                    value = null
                }
                if (value == null && field.nulls !== true) {
                    //  Match null and undefined
                    continue
                } else if (typeof value == 'object') {
                    result[key] = this.handleEmpties(field, value)
                } else {
                    result[key] = value
                }
            }
        } else {
            result = obj
        }
        return result
    }

    getPartial(field, params) {
        let partial = params.partial
        if (partial === undefined) {
            partial = field.partial
            if (partial == undefined) {
                partial = this.table.partial
            }
        }
        return partial
    }

    /*  KEEP
    captureStack() {
        let limit = Error.stackTraceLimit
        Error.stackTraceLimit = 1

        let obj = {}
        let v8Handler = Error.prepareStackTrace
        Error.prepareStackTrace = function(obj, stack) { return stack }
        Error.captureStackTrace(obj, this.captureStack)

        let stack = obj.stack
        Error.prepareStackTrace = v8Handler
        Error.stackTraceLimit = limit

        let frame = stack[0]
        return `${frame.getFunctionName()}:${frame.getFileName()}:${frame.getLineNumber()}`
    } */
}
