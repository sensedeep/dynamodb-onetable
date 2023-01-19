/*
    Expression.js - DynamoDB API command builder

    This module converts API requests into DynamoDB commands.
*/
import {OneTableArgError, OneTableError} from './Error.js'

//  Operators used on sort keys for get/delete
const KeyOperators = ['<', '<=', '=', '>=', '>', 'begins', 'begins_with', 'between']

export class Expression {
    constructor(model, op, properties, params = {}) {
        this.init(model, op, properties, params)
        this.prepare()
    }

    init(model, op, properties, params) {
        this.model = model
        this.op = op
        this.properties = properties
        this.params = params

        this.table = model.table
        this.already = {} //  Fields already processed (index is property name).
        this.conditions = [] //  Condition expressions.
        this.filters = [] //  Filter expressions.
        this.key = {} //  Primary key attribute.
        this.keys = [] //  Key conditions.
        this.mapped = {} //  Mapped fields.
        this.names = {} //  Expression names. Keys are the indexes.
        this.namesMap = {} //  Expression names reverse map. Keys are the names.
        this.puts = {} //  Put values
        this.project = [] //  Projection expressions.
        this.values = {} //  Expression values. Keys are the value indexes.
        this.valuesMap = {} //  Expression values reverse map. Keys are the values.
        this.nindex = 0 //  Next index into names.
        this.vindex = 0 //  Next index into values.
        this.updates = {
            add: [],
            delete: [],
            remove: [],
            set: [],
        }
        this.execute = params.execute === false ? false : true
        this.tableName = model.tableName

        /*
            Find the index for this expression. Then store the attribute names for the index.
         */
        this.index = this.selectIndex(model.indexes)

        /*
            Get the request index hash/sort attributes
         */
        this.hash = this.index.hash
        this.sort = this.index.sort

        if (!this.table.client) {
            throw new OneTableArgError('Table has not yet defined a "client" instance')
        }
    }

    prepare() {
        let {op, params, properties} = this
        let fields = this.model.block.fields
        if (op == 'find') {
            this.addWhereFilters()
        } else if (op == 'delete' || op == 'put' || op == 'update' || op == 'check') {
            this.addConditions(op)
        } else if (op == 'scan') {
            this.addWhereFilters()
            /*
                Setup scan filters for properties outside the model.
                Use the property name here as there can't be a mapping.
            */
            for (let [name, value] of Object.entries(this.properties)) {
                if (fields[name] == null && value != null) {
                    this.addGenericFilter(name, value)
                    this.already[name] = true
                }
            }
        }

        this.addProperties(op, null, fields, properties)

        /*
            Emit mapped attributes that don't correspond to schema fields.
        */
        if (this.mapped) {
            for (let [att, props] of Object.entries(this.mapped)) {
                if (Object.keys(props).length != this.model.mappings[att].length) {
                    throw new OneTableArgError(
                        `Missing properties for mapped data field "${att}" in model "${this.model.name}"`
                    )
                }
            }
            for (let [k, v] of Object.entries(this.mapped)) {
                this.add(null, properties, {attribute: [k], name: k, filter: false}, v, properties)
            }
        }
        if (params.fields) {
            for (let name of params.fields) {
                if (op == 'batchGet') {
                    //  BatchGet params.project must provide attributes not properties
                    this.project.push(`#_${this.addName(name)}`)
                } else if (fields[name]) {
                    let att = fields[name].attribute[0]
                    this.project.push(`#_${this.addName(att)}`)
                }
            }
        }
    }

    addProperties(op, pathname, fields, properties) {
        for (let [name, value] of Object.entries(properties)) {
            if (this.already[name]) {
                continue
            }
            let field = fields[name]
            if (field) {
                let partial = this.model.getPartial(field, this.params)
                if (op != 'put' && partial) {
                    if (field.schema && value != null) {
                        let path = pathname ? `${pathname}.${field.attribute[0]}` : field.attribute[0]
                        if (field.isArray && Array.isArray(value)) {
                            let i = 0
                            for (let rvalue of value) {
                                let indexPath = path ? `${path}[${i}]` : `${path}[${i}]`
                                this.addProperties(op, indexPath, field.block.fields, rvalue)
                                i++
                            }
                        } else {
                            this.addProperties(op, path, field.block.fields, value)
                        }
                    } else {
                        this.add(pathname, properties, field, value)
                    }
                } else {
                    this.add(pathname, properties, field, value)
                }
            } else if (this.model.generic) {
                this.add(pathname, properties, {attribute: [name], name}, value)
            }
        }
    }

    /*
        Add a field to the command expression
     */
    add(pathname, properties, field, value) {
        let op = this.op
        let attribute = field.attribute

        /*
            Handle mapped and packed attributes.
            The attribute[0] contains the top level attribute name. Attribute[1] contains a nested mapping name.
        */
        if (attribute.length > 1) {
            let mapped = this.mapped
            let [k, v] = attribute
            mapped[k] = mapped[k] || {}
            mapped[k][v] = value
            properties[k] = value
            return
        }
        //  May contain a '.'
        let path = pathname ? `${pathname}.${attribute[0]}` : attribute[0]

        if (path == this.hash || path == this.sort) {
            if (op == 'find') {
                this.addKey(op, field, value)
            } else if (op == 'scan') {
                if (properties[field.name] !== undefined && field.filter !== false) {
                    this.addFilter(path, field, value)
                }
            } else if ((op == 'delete' || op == 'get' || op == 'update' || op == 'check') && field.isIndexed) {
                this.addKey(op, field, value)
            } else if (op == 'put' || (this.params.batch && op == 'update')) {
                //  Batch does not use update expressions (Ugh!)
                this.puts[path] = value
            }
        } else {
            if (op == 'find' || op == 'scan') {
                //  schema.filter == false disables a field from being used in a filter
                if (properties[field.name] !== undefined && field.filter !== false) {
                    if (!this.params.batch) {
                        //  Batch does not support filter expressions
                        this.addFilter(path, field, value)
                    }
                }
            } else if (op == 'put' || (this.params.batch && op == 'update')) {
                //  Batch does not use update expressions (Ugh!)
                this.puts[path] = value
            } else if (op == 'update') {
                this.addUpdate(path, field, value)
            }
        }
    }

    /*
        Conditions for create | delete | update
        May also be used by 'get' in fallback mode.
     */
    addConditions(op) {
        let {conditions, params} = this
        let {hash, sort} = this.index
        if (params.exists === true) {
            conditions.push(`attribute_exists(#_${this.addName(hash)})`)
            if (sort) {
                conditions.push(`attribute_exists(#_${this.addName(sort)})`)
            }
        } else if (params.exists === false) {
            conditions.push(`attribute_not_exists(#_${this.addName(hash)})`)
            if (sort) {
                conditions.push(`attribute_not_exists(#_${this.addName(sort)})`)
            }
        }
        if (params.type && sort) {
            conditions.push(`attribute_type(#_${this.addName(sort)}, ${params.type})`)
        }
        if (op == 'update') {
            this.addUpdateConditions()
        }
        if (params.where) {
            conditions.push(this.expand(params.where))
        }
    }

    /*
        Expand a where/set expression. Replace: ${var} and {value} tokens.
     */
    expand(where) {
        const expr = where
        let fields = this.model.block.fields
        //  Expand attribute references and make attribute name
        where = where.toString().replace(/\${(.*?)}/g, (match, varName) => {
            return this.makeTarget(fields, varName)
        })

        //  Expand variable substitutions
        where = where.replace(/@{(.*?)}/g, (match, value) => {
            let index
            const {substitutions} = this.params
            let name = value.replace(/^\.\.\./, '')
            if (!substitutions || substitutions[name] === undefined) {
                throw new OneTableError(`Missing substitutions for attribute value "${name}"`, {
                    expr,
                    substitutions,
                    properties: this.properties,
                })
            }
            //  Support @{...list} to support filter expressions "IN ${...list}"
            if (value != name && Array.isArray(substitutions[name])) {
                let indicies = []
                for (let item of substitutions[name]) {
                    indicies.push(this.addValue(item))
                }
                return indicies.map((i) => `:_${i}`).join(', ')
            }
            index = this.addValue(substitutions[name])
            return `:_${index}`
        })

        //  Expand value references and make attribute values. Allow new-lines in values.
        where = where.replace(/{(.*?)}/gs, (match, value) => {
            let index
            if (value.match(/^[-+]?([0-9]+(\.[0-9]*)?|\.[0-9]+)$/)) {
                index = this.addValue(+value)
            } else {
                let matched = value.match(/^"(.*)"$/)
                if (matched) {
                    index = this.addValue(matched[1])
                } else if (value instanceof Date) {
                    value = this.table.transformWriteDate(value)
                    index = this.addValue(value)
                } else if (value == 'true' || value == 'false') {
                    index = this.addValue(value == 'true' ? true : false)
                } else {
                    index = this.addValue(value)
                }
            }
            return `:_${index}`
        })
        return where
    }

    /*
        Add where filter expressions for find and scan
     */
    addWhereFilters() {
        if (this.params.where) {
            this.filters.push(this.expand(this.params.where))
        }
    }

    addFilter(pathname, field, value) {
        let {filters} = this
        /*
        let att = field.attribute[0]
        let pathname = field.pathname || att
        */
        if (pathname == this.hash || pathname == this.sort) {
            return
        }
        let [target, variable] = this.prepareKeyValue(pathname, value)
        filters.push(`${target} = ${variable}`)
    }

    /*
        Add filters when model not known
     */
    addGenericFilter(att, value) {
        this.filters.push(`#_${this.addName(att)} = :_${this.addValue(value)}`)
    }

    /*
        Add key for find, delete, get or update
     */
    addKey(op, field, value) {
        let att = field.attribute[0]
        if (op == 'find') {
            let keys = this.keys
            if (att == this.sort && typeof value == 'object' && Object.keys(value).length > 0) {
                let [action, vars] = Object.entries(value)[0]
                if (KeyOperators.indexOf(action) < 0) {
                    throw new OneTableArgError(`Invalid KeyCondition operator "${action}"`)
                }
                if (action == 'begins_with' || action == 'begins') {
                    keys.push(`begins_with(#_${this.addName(att)}, :_${this.addValue(vars)})`)
                } else if (action == 'between') {
                    keys.push(
                        `#_${this.addName(att)} BETWEEN :_${this.addValue(vars[0])} AND :_${this.addValue(vars[1])}`
                    )
                } else {
                    keys.push(`#_${this.addName(att)} ${action} :_${this.addValue(value[action])}`)
                }
            } else {
                keys.push(`#_${this.addName(att)} = :_${this.addValue(value)}`)
            }
        } else {
            this.key[att] = value
        }
    }

    /*
        Convert literal attribute names to symbolic ExpressionAttributeName indexes
     */
    prepareKey(key) {
        this.already[key] = true
        return this.makeTarget(this.model.block.fields, key)
    }

    /*
        Convert attribute values to symbolic ExpressionAttributeValue indexes
     */
    prepareKeyValue(key, value) {
        let target = this.prepareKey(key)
        let requiresExpansion = typeof value == 'string' && value.match(/\${.*?}|@{.*?}|{.*?}/)
        if (requiresExpansion) {
            return [target, this.expand(value)]
        } else {
            return [target, this.addValueExp(value)]
        }
    }

    addUpdate(pathname, field, value) {
        let {params, updates} = this
        /*
        let att = field.attribute[0]
        let pathname = field.pathname || att
        */
        if (pathname == this.hash || pathname == this.sort) {
            return
        }
        if (field.name == this.model.typeField) {
            if (!(params.exists === null || params.exists == false)) {
                //  If not creating, then don't need to update the type as it must already exist
                return
            }
        }
        if (params.remove && params.remove.indexOf(field.name) >= 0) {
            return
        }
        let target = this.prepareKey(pathname)
        let variable = this.addValueExp(value)
        updates.set.push(`${target} = ${variable}`)
    }

    addUpdateConditions() {
        let {params, updates} = this
        let fields = this.model.block.fields

        const assertIsNotPartition = (key, op) => {
            if (key == this.hash || key == this.sort) {
                throw new OneTableArgError(`Cannot ${op} hash or sort`)
            }
        }

        if (params.add) {
            for (let [key, value] of Object.entries(params.add)) {
                assertIsNotPartition(key, 'add')
                const [target, variable] = this.prepareKeyValue(key, value)
                updates.add.push(`${target} ${variable}`)
            }
        }
        if (params.delete) {
            for (let [key, value] of Object.entries(params.delete)) {
                assertIsNotPartition(key, 'delete')
                const [target, variable] = this.prepareKeyValue(key, value)
                updates.delete.push(`${target} ${variable}`)
            }
        }
        if (params.remove) {
            params.remove = [].concat(params.remove) // enforce array
            for (let key of params.remove) {
                assertIsNotPartition(key, 'remove')
                if (fields.required) {
                    throw new OneTableArgError('Cannot remove required field')
                }
                const target = this.prepareKey(key)
                updates.remove.push(`${target}`)
            }
        }
        if (params.set) {
            for (let [key, value] of Object.entries(params.set)) {
                assertIsNotPartition(key, 'set')
                const [target, variable] = this.prepareKeyValue(key, value)
                updates.set.push(`${target} = ${variable}`)
            }
        }
        if (params.push) {
            for (let [key, value] of Object.entries(params.push)) {
                assertIsNotPartition(key, 'push')
                let empty = this.addValueExp([])
                let items = this.addValueExp([].concat(value)) // enforce array on values
                const target = this.prepareKey(key)
                updates.set.push(`${target} = list_append(if_not_exists(${target}, ${empty}), ${items})`)
            }
        }
    }

    //  Translate an attribute reference to use name attributes. Works with "."
    makeTarget(fields, name) {
        let target = []
        for (let prop of name.split('.')) {
            let subscript = prop.match(/\[[^\]]+\]+/)
            if (subscript) {
                prop = prop.replace(/\[[^\]]+\]+/, '')
                subscript = subscript[0]
            } else {
                subscript = ''
            }
            let field = fields ? fields[prop] : null
            if (field) {
                target.push(`#_${this.addName(field.attribute[0])}${subscript}`)
                //  If nested schema, advance to the next level
                fields = field.schema ? field.block.fields : null
            } else {
                //  No field, so just use the property name.
                target.push(`#_${this.addName(prop)}${subscript}`)
                fields = null
            }
        }
        return target.join('.')
    }

    selectIndex(indexes) {
        let index = indexes.primary
        if (this.params.index) {
            if (this.params.index != 'primary') {
                index = indexes[this.params.index]
            }
        }
        return index
    }

    /*
        Create the Dynamo command parameters. Called from Model.run
     */
    command() {
        let {conditions, filters, key, keys, hash, model, names, op, params, project, puts, values} = this

        if (key == null && values[hash] == null && op != 'scan') {
            throw new OneTableError(`Cannot find hash key for "${op}"`, {values})
        }
        if (op == 'get' || op == 'delete' || op == 'update') {
            if (key == null) {
                return null
            }
        }
        let namesLen = Object.keys(names).length
        let valuesLen = Object.keys(values).length

        if (op == 'put') {
            puts = this.table.marshall(puts, params)
        }
        values = this.table.marshall(values, params)
        key = this.table.marshall(key, params)

        let args
        if (params.batch) {
            if (op == 'get') {
                args = {Keys: key}
            } else if (op == 'delete') {
                args = {Key: key}
            } else if (op == 'put') {
                args = {Item: puts}
            } else {
                throw new OneTableArgError(`Unsupported batch operation "${op}"`)
            }
            if (filters.length) {
                throw new OneTableArgError('Invalid filters with batch operation')
            }
        } else {
            args = {
                ConditionExpression: conditions.length ? this.and(conditions) : undefined,
                ExpressionAttributeNames: namesLen > 0 ? names : undefined,
                ExpressionAttributeValues: namesLen > 0 && valuesLen > 0 ? values : undefined,
                FilterExpression: filters.length ? this.and(filters) : undefined,
                KeyConditionExpression: keys.length ? keys.join(' and ') : undefined,
                ProjectionExpression: project.length ? project.join(', ') : undefined,
                TableName: this.tableName,
            }
            if (params.select) {
                //  Select: ALL_ATTRIBUTES | ALL_PROJECTED_ATTRIBUTES | SPECIFIC_ATTRIBUTES | COUNT
                if (project.length && params.select != 'SPECIFIC_ATTRIBUTES') {
                    throw new OneTableArgError('Select must be SPECIFIC_ATTRIBUTES with projection expressions')
                }
                args.Select = params.select
            } else if (params.count) {
                if (project.length) {
                    throw new OneTableArgError('Cannot use select and count together')
                }
                args.Select = 'COUNT'
            }
            if (params.stats || this.table.metrics) {
                args.ReturnConsumedCapacity = params.capacity || 'TOTAL' // INDEXES | TOTAL | NONE
                args.ReturnItemCollectionMetrics = 'SIZE' // SIZE | NONE
            }
            let returnValues
            if (params.return !== undefined) {
                if (params.return === true) {
                    returnValues = op === 'delete' ? 'ALL_OLD' : 'ALL_NEW'
                } else if (params.return === false || params.return == 'none') {
                    returnValues = 'NONE'
                } else if (params.return != 'get') {
                    returnValues = params.return
                }
            }
            if (op == 'put') {
                args.Item = puts
                args.ReturnValues = returnValues || 'NONE'
            } else if (op == 'update') {
                args.ReturnValues = returnValues || 'ALL_NEW'
                let updates = []
                for (let op of ['add', 'delete', 'remove', 'set']) {
                    if (this.updates[op].length) {
                        updates.push(`${op} ${this.updates[op].join(', ')}`)
                    }
                }
                args.UpdateExpression = updates.join(' ')
            } else if (op == 'delete') {
                args.ReturnValues = returnValues || 'ALL_OLD'
            }

            if (op == 'delete' || op == 'get' || op == 'update' || op == 'check') {
                args.Key = key
            }
            if (op == 'find' || op == 'get' || op == 'scan') {
                args.ConsistentRead = params.consistent ? true : false
                args.IndexName = params.index ? params.index : null
            }
            if (op == 'find' || op == 'scan') {
                args.Limit = params.limit ? params.limit : undefined
                /*
                    Scan reverse if either reverse or prev is true but not both. (XOR)
                    If both are true, then requesting the previous page of a reverse scan which is actually forwards.
                */
                args.ScanIndexForward =
                    (params.reverse == true) ^ (params.prev != null && params.next == null) ? false : true

                /*
                    Cherry pick the required properties from the next/prev param
                 */
                let cursor = params.next || params.prev
                if (cursor) {
                    let {hash, sort} = this.index
                    let start = {[hash]: cursor[hash], [sort]: cursor[sort]}
                    if (this.params.index != 'primary') {
                        let {hash, sort} = this.model.indexes.primary
                        start[hash] = cursor[hash]
                        start[sort] = cursor[sort]
                    }
                    args.ExclusiveStartKey = this.table.marshall(start, params)
                }
            }
            if (op == 'scan') {
                if (params.segments != null) {
                    args.TotalSegments = params.segments
                }
                if (params.segment != null) {
                    args.Segment = params.segment
                }
            }
        }
        //  Remove null entries
        if (args) {
            args = Object.fromEntries(Object.entries(args).filter(([, v]) => v != null))
        }

        if (typeof params.postFormat == 'function') {
            args = params.postFormat(model, args)
        }
        return args
    }

    /*
        Join the terms with 'and'
    */
    and(terms) {
        if (terms.length == 1) {
            return terms.join('')
        }
        return terms.map((t) => `(${t})`).join(' and ')
    }

    /*
        Add a name to the ExpressionAttribute names. Optimize duplicates and only store unique names once.
    */
    addName(name) {
        let index = this.namesMap[name]
        if (index == null) {
            index = this.nindex++
            this.names[`#_${index}`] = name
            this.namesMap[name] = index
        }
        return index
    }

    /*
        Add a value to the ExpressionAttribute values. Optimize duplicates and only store unique names once.
        Except for numbers because we don't want to confuse valuesMap indexes. i.e. 7 vs "7"
    */
    addValue(value) {
        let index
        if (value && typeof value != 'object' && typeof value != 'number') {
            index = this.valuesMap[value]
        }
        if (index == null) {
            index = this.vindex++
            this.values[`:_${index}`] = value
            if (value && typeof value != 'object' && typeof value != 'number') {
                this.valuesMap[value] = index
            }
        }
        return index
    }

    addValueExp(value) {
        return `:_${this.addValue(value)}`
    }
}
