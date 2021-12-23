/*
    Expression.js - DynamoDB API command builder

    This module converts API requests into DynamoDB commands.
*/

import {OneError, OneArgError} from './Error.js'

//  Operators used on sort keys for get/delete
const KeyOperators =    [ '<', '<=', '=', '>=', '>', 'begins', 'begins_with', 'between' ]

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
        this.already = {}           //  Fields already processed (index is property name)
        this.conditions = []        //  Condition expressions
        this.filters = []           //  Filter expressions
        this.key = {}               //  Primary key attribute
        this.keys = []              //  Key conditions
        this.mapped = {}            //  Mapped fields
        this.names = {}             //  Expression names. Keys are the indexes.
        this.namesMap = {}          //  Expression names reverse map. Keys are the names.
        this.project = []           //  Projection expressions
        this.values = {}            //  Expression values. Keys are the indexes.
        this.valuesMap = {}         //  Expression values reverse map. Keys are the values.
        this.nindex = 0             //  Next index into names
        this.vindex = 0             //  Next index into values
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
            throw new OneArgError('Table has not yet defined a "client" instance')
        }
    }

    prepare() {
        let {op, params, properties} = this
        let fields = this.model.block.fields
        if (op == 'find') {
            this.addFilters()

        } else if (op == 'delete' || op == 'put' || op == 'update') {
            this.addConditions(op)

        } else if (op == 'scan') {
            this.addFilters()
            /*
                Setup scan filters for properties outside the model.
                Use the property name here as there can't be a mapping.
            */
            for (let [name, value] of Object.entries(this.properties)) {
                if (fields[name] == null && value != null) {
                    this.addFilter(name, value)
                    this.already[name] = true
                }
            }
        }

        /*
            Parse the API properties. Only accept properties defined in the schema unless generic.
        */
        for (let [name, value] of Object.entries(properties)) {
            if (this.already[name]) {
                continue
            }
            if (fields[name]) {
                this.add(fields[name], value)
            } else if (this.model.generic) {
                this.add({attribute: [name], name}, value)
            }
        }

        /*
            Emit mapped attributes that don't correspond to schema fields.
        */
        if (this.mapped) {
            for (let [att, props] of Object.entries(this.mapped)) {
                if (Object.keys(props).length != this.model.mappings[att].length) {
                    throw new OneArgError(`Missing properties for mapped data field "${att}" in model "${this.model.name}"`)
                }
            }
            for (let [k,v] of Object.entries(this.mapped)) {
                this.add({attribute: [k], name: k, filter: false}, v, properties)
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

    /*
        Add a field to the command expression
     */
    add(field, value) {
        let properties = this.properties
        let op = this.op
        let attribute = field.attribute

        /*
            Handle mapped and packed attributes.
            The attribute[0] contains the top level attribute name. Attribute[1] contains a nested mapping name.
        */
        if (attribute.length > 1) {
            let mapped = this.mapped
            let [k,v] = attribute
            mapped[k] = mapped[k] || {}
            mapped[k][v] = value
            properties[k] = value
            return
        }
        //  Pathname may contain a '.'
        let pathname = attribute[0]
        let att = pathname.split('.').shift()

        if (att == this.hash || att == this.sort) {
            if (op == 'find') {
                this.addKey(op, field, value)

            } else if (op == 'scan') {
                if (properties[field.name] !== undefined && field.filter !== false) {
                    this.addFilter(att, value)
                }

            } else if ((op == 'delete' || op == 'get' || op == 'update') && field.isIndexed) {
                this.addKey(op, field, value)

            } else if (op == 'put' || (this.params.batch && op == 'update')) {
                //  Batch does not use update expressions (Ugh!)
                this.values[att] = value
            }

        } else {
            if ((op == 'find' || op == 'scan')) {
                //  schema.filter == false disables a field from being used in a filter
                if (properties[field.name] !== undefined && field.filter !== false) {
                    if (!this.params.batch) {
                        //  Batch does not support filter expressions
                        this.addFilter(att, value)
                    }
                }

            } else if (op == 'put' || (this.params.batch && op == 'update')) {
                //  Batch does not use update expressions (Ugh!)
                this.values[att] = value

            } else if (op == 'update') {
                this.addUpdate(field, value)
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
            conditions.push(`attribute_exists(${hash})`)
            if (sort) {
                conditions.push(`attribute_exists(${sort})`)
            }

        } else if (params.exists === false) {
            conditions.push(`attribute_not_exists(${hash})`)
            if (sort) {
                conditions.push(`attribute_not_exists(${sort})`)
            }
        }
        if (params.type && sort) {
            conditions.push(`attribute_type(${sort}, ${params.type})`)
        }
        if (op == 'update') {
            this.addUpdates()
        }
        if (params.where && (op == 'delete' || op == 'update')) {
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
            if (!substitutions || !substitutions[name]) {
                throw new OneError(`Missing substitutions for attribute value "${name}"`, {
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
                return indicies.map(i => `:_${i}`).join(', ')
            }
            index = this.addValue(substitutions[name])
            return `:_${index}`
        })

        //  Expand value references and make attribute values. Allow new-lines in values.
        where = where.replace(/{(.*?)}/sg, (match, value) => {
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
        Add filter expressions for find and scan
     */
    addFilters() {
        if (this.params.where) {
            this.filters.push(this.expand(this.params.where))
        }
    }

    /*
        Add filters for non-key attributes for find and scan
     */
    addFilter(att, value) {
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
                let [action,vars] = Object.entries(value)[0]
                if (KeyOperators.indexOf(action) < 0) {
                    throw new OneArgError(`Invalid KeyCondition operator "${action}"`)
                }
                if (action == 'begins_with' || action == 'begins') {
                    keys.push(`begins_with(#_${this.addName(att)}, :_${this.addValue(vars)})`)

                } else if (action == 'between') {
                    keys.push(`#_${this.addName(att)} BETWEEN :_${this.addValue(vars[0])} AND :_${this.addValue(vars[1])}`)

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

    addUpdate(field, value) {
        let {params, updates} = this
        let att = field.attribute[0]
        if (att == this.hash || att == this.sort) {
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
        if (field.isIndexed && params.updateIndexes !== true && params.exists !== null) {
            //  Update indexes if explicitly requested or doing update(, {exists: null}), i.e. create.
            return
        }
        updates.set.push(`#_${this.addName(att)} = :_${this.addValue(value)}`)
    }

    addUpdates() {
        let {params, updates} = this
        let fields = this.model.block.fields

        if (params.add) {
            //  keys are property names not attributes
            for (let [key, value] of Object.entries(params.add)) {
                if (key == this.hash || key == this.sort) {
                    throw new OneArgError('Cannot add to hash or sort')
                }
                this.already[key] = true
                let target = this.makeTarget(fields, key)
                updates.add.push(`${target} :_${this.addValue(value)}`)
            }
        }
        if (params.delete) {
            for (let [key, value] of Object.entries(params.delete)) {
                if (key == this.hash || key == this.sort) {
                    throw new OneArgError('Cannot delete hash or sort')
                }
                this.already[key] = true
                let target = this.makeTarget(fields, key)
                updates.delete.push(`${target} :_${this.addValue(value)}`)
            }
        }
        if (params.remove) {
            if (!Array.isArray(params.remove)) {
                params.remove = [params.remove]
            }
            let fields = this.model.block.fields
            for (let key of params.remove) {
                if (key == this.hash || key == this.sort) {
                    throw new OneArgError('Cannot remove hash or sort')
                }
                if (fields.required) {
                    throw new OneArgError('Cannot remove required field')
                }
                this.already[key] = true
                let target = this.makeTarget(fields, key)
                updates.remove.push(`${target}`)
            }
        }
        if (params.set) {
            for (let [key, value] of Object.entries(params.set)) {
                if (key == this.hash || key == this.sort) {
                    throw new OneArgError('Cannot set hash or sort')
                }
                this.already[key] = true
                let target = this.makeTarget(fields, key)
                //  If value is number of simple string then don't expand
                if (value.toString().match(/\${.*?}|@{.*?}|{.*?}/)) {
                    updates.set.push(`${target} = ${this.expand(value)}`)
                } else {
                    updates.set.push(`${target} = :_${this.addValue(value)}`)
                }
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
        let {conditions, filters, key, keys, hash, model, names, op, params, project, values} = this

        if (key == null && values[hash] == null && op != 'scan') {
            throw new OneError(`Cannot find hash key for "${op}"`, {values})
        }
        if (op == 'get' || op == 'delete' || op == 'update') {
            if (key == null) {
                return null
            }
        }
        let namesLen = Object.keys(names).length
        let valuesLen = Object.keys(values).length

        values = this.table.marshall(values)
        key = this.table.marshall(key)

        let args
        if (params.batch) {
            if (op == 'get') {
                args = { Keys: key }
            } else if (op == 'delete') {
                args = { Key: key }
            } else if (op == 'put') {
                args = { Item: values }
            } else {
                throw new OneArgError(`Unsupported batch operation "${op}"`)
            }
            if (filters.length) {
                throw new OneArgError('Invalid filters with batch operation')
            }

        } else {
            args = {
                ConditionExpression: conditions.length ? this.and(conditions) : undefined,
                ExpressionAttributeNames: namesLen > 0 ? names : undefined,
                ExpressionAttributeValues: (namesLen > 0 && valuesLen > 0) ? values : undefined,
                FilterExpression: filters.length ? this.and(filters) : undefined,
                KeyConditionExpression: keys.length ? keys.join(' and ') : undefined,
                ProjectionExpression: project.length ? project.join(', ') : undefined,
                TableName: this.tableName
            }
            if (params.select) {
                //  Select: ALL_ATTRIBUTES | ALL_PROJECTED_ATTRIBUTES | SPECIFIC_ATTRIBUTES | COUNT
                if (project.length && params.select != 'SPECIFIC_ATTRIBUTES') {
                    throw new OneArgError('Select must be SPECIFIC_ATTRIBUTES with projection expressions')
                }
                args.Select = params.select

            } else if (params.count) {
                if (project.length) {
                    throw new OneArgError('Cannot use select and count together')
                }
                args.Select = 'COUNT'
            }
            if (params.stats || this.table.metrics) {
                args.ReturnConsumedCapacity = params.capacity || 'TOTAL'    // INDEXES | TOTAL | NONE
                args.ReturnItemCollectionMetrics = 'SIZE'                   // SIZE | NONE
            }
            if (op == 'put') {
                args.Item = values
                args.ReturnValues = params.return || 'NONE'

            } else if (op == 'update') {
                args.ReturnValues = params.return || 'ALL_NEW'
                let updates = []
                for (let op of ['add', 'delete', 'remove', 'set']) {
                    if (this.updates[op].length) {
                        updates.push(`${op} ${this.updates[op].join(', ')}`)
                    }
                }
                args.UpdateExpression = updates.join(' ')
            }
            if (op == 'delete' || op == 'get' || op == 'update') {
                args.Key = key
            }
            if (op == 'find' || op == 'get' || op == 'scan') {
                args.ConsistentRead = params.consistent ? true : false,
                args.IndexName = params.index ? params.index : null
            }
            if (op == 'find' || op == 'scan') {
                args.Limit = params.limit ? params.limit : undefined
                /*
                    Scan reverse if either reverse or prev is true but not both. (XOR)
                    If both are true, then requesting the previous page of a reverse scan which is
                    actually forwards.
                */
                args.ScanIndexForward = (params.reverse == true ^ params.prev != null) ? false : true

                if (params.next || params.prev) {
                    args.ExclusiveStartKey = this.table.marshall(params.next || params.start || params.prev)
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
        return terms.map(t => `(${t})`).join(' and ')
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
            if (value && typeof value != 'object') {
                this.valuesMap[value] = index
            }
        }
        return index
    }
}
