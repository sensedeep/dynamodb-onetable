/*
    Expression.js - DynamoDB API command builder
*/

const KeyOperators = [ '<', '<=', '=', '>=', '>', 'begins', 'begins_with', 'between' ]
const FilterOperators = [ '<', '<=', '=', '<>', '>=', '>', 'begins', 'begins_with', 'between' ]

export default class Expression {
    /*
        Create an Expression
        @param model Model instance
        @param op Operation ['delete', 'find', 'put', 'scan', 'update']
        @param params Options hash
     */
    constructor(model, op, properties, params) {
        this.init(model, op, properties, params)

        if (!this.fallback) {
            this.parseFields(this.model.fields, properties)
        }
    }

    init(model, op, properties, params) {
        this.model = model
        this.table = model.table
        this.op = op
        this.params = params
        this.properties = properties

        //  Facets of the API call parsed into Dynamo conditions, filters, key, keys, updates...
        this.conditions = []        //  Condition expressions
        this.fields = []            //  Projection expressions
        this.filters = []           //  Filter expressions
        this.key = {}               //  Primary key
        this.keys = []              //  Key conditions
        this.updates = []           //  Update expressions
        this.names = {}             //  Expression names
        this.values = {}            //  Expression values
        this.fieldValues = {}       //  Hash of attribute values

        this.nindex = 0             //  Next index into names
        this.vindex = 0             //  Next index into values
        this.fallback = false       //  Falling back to use find first

        this.execute = params.execute === false ? false : true

        this.delimiter = model.delimiter        //  Composite sort key delimiter
        this.tableName = model.tableName

        /*
            Find the index for this expression
         */
        this.index = this.selectIndex(model.indexes, params)
        this.hash = this.index.hash
        this.sort = this.index.sort
    }

    /*
        Calculate property values by applying templates from field.value and removing empty values
        @param fields Model fields
        @param properties Javascript hash of data attributes for the API
     */
    parseFields(fields, properties = {}) {
        let op = this.op
        let context = this.params.context || this.table.context
        for (let [fieldName, field] of Object.entries(fields)) {
            let value = this.template(field, properties, context)
            if (value === undefined || value === null || value === '') {
                if (field.uuid && op == 'put') {
                    value = this.table.uuid()
                } else if (field.name == this.sort && this.params.high && op != 'scan') {
                    //  High level API without sort key. Fallback to find to select the items of interest
                    this.fallback = true
                    return
                } else if (value === undefined || (value === null && field.nulls !== true)) {
                    continue
                }
            } else if (typeof value == 'object') {
                value = this.removeEmptyStrings(field, value)
            }
            this.add(field, value)
            if (this.fallback) return
        }

        if (op != 'scan' && this.fieldValues[this.hash] == null) {
            throw new Error(`dynamo: Empty hash key`)
        }
        if (op == 'delete' || op == 'put' || op == 'update') {
            this.addConditions(op)
        } else if (op == 'find' || op == 'scan') {
            this.addFilters()
        }
        if (op == 'scan') {
            /*
                Setup scan filters for properties outside the model
             */
            for (let [name, value] of Object.entries(properties)) {
                if (fields[name] || value == null) continue
                this.addFilter(name, value)
                this.fieldValues[name] = value
            }
        }
    }

    /*
        Add a field to the command expression
     */
    add(field, value) {
        let op = this.op

        if (field.isIndexed) {
            if (field.attribute == this.hash || field.attribute == this.sort) {
                if (op == 'find') {
                    this.addKeys(field, value)

                } else if (op == 'scan') {
                    if (this.properties[field.name] !== undefined && field.filter !== false) {
                        this.addFilter(field.attribute, value)
                    }

                } else if ((op == 'delete' || op == 'get' || op == 'update') && field.isIndexed) {
                    this.addKey(field, value)
                }
            }
        } else if ((op == 'find' || op == 'scan')) {
            //  schema.filter == false disables a field from being used in a filter
            if (this.properties[field.name] !== undefined && field.filter !== false) {
                this.addFilter(field.attribute, value)
            }
        }
        if (op == 'put' || (this.params.batch && op == 'update')) {
            //  Batch does not use update expressions (Ugh!)
            this.values[field.attribute] = value

        } else if (op == 'update') {
            this.addUpdate(field, value)
        }
        this.fieldValues[field.attribute] = value
    }

    /*
        Conditions for create | delete | update
        May also be used by 'get' in fallback mode.
     */
    addConditions(op) {
        let {conditions, params} = this
        let {hash, sort} = this.index

        let attribute
        if (params.exists === true) {
            conditions.push(`attribute_exists(${hash})`)
            conditions.push(`attribute_exists(${sort})`)

        } else if (params.exists === false) {
            conditions.push(`attribute_not_exists(${hash})`)
            conditions.push(`attribute_not_exists(${sort})`)
        }
        if (params.type) {
            conditions.push(`attribute_type(${sort}, ${params.type})`)
        }
        if (op == 'update' && (params.add || params.remove || params.delete)) {
            this.addUpdates()
        }
        if (params.where && (op == 'delete' || op == 'update')) {
            conditions.push(this.makeConditions(params.where))
        }
    }

    /*
        Make a conditions expression. Replace: ${var} and {value} tokens.
     */
    makeConditions(where) {
        let {names, nindex, values, vindex} = this

        where = where.replace(/\${(.*?)}/g, (match, varName) => {
            let attribute = this.model.map[varName] || varName
            names[`#_${nindex++}`] = attribute
            return `#_${nindex - 1}`
        })
        where = where.replace(/{(.*?)}/g, (match, value) => {
            if (value.match(/^\d+$/)) {
                values[`:_${vindex++}`] = +value
            } else {
                let matched = value.match(/^"(.*)"$/)
                if (matched) {
                    values[`:_${vindex++}`] = matched[1]
                } else if (value == 'true' || value == 'false') {
                    values[`:_${vindex++}`] = (value == 'true' ? true : false)
                } else {
                    values[`:_${vindex++}`] = value
                }
            }
            return `:_${vindex - 1}`
        })
        this.nindex = nindex
        this.vindex = vindex
        return where
    }

    /*
        Add filter expressions for find and scan
     */
    addFilters() {
        if (this.params.where) {
            this.filters.push(this.makeConditions(this.params.where))
        }
    }

    /*
        Add filters for non-key properties for find and scan
     */
    addFilter(attribute, value) {
        let {names, nindex, values, vindex} = this

        if (typeof value == 'object' && Object.keys(value).length > 0) {
            let [action,vars] = Object.entries(value)[0]
            if (FilterOperators.indexOf(action) < 0) {
                throw new Error(`Invalid FilterCondition operator "${action}"`)
            }
            if (action == 'begins_with' || action == 'begins') {
                this.filters.push(`begins_with(#_${nindex}, :_${vindex})`)
                values[`:_${vindex++}`] = vars

            } else if (action == 'between') {
                this.filters.push(`between(#_${nindex}, :_${vindex}, :_${vindex+1})`)
                values[`:_${vindex++}`] = vars[0]
                values[`:_${vindex++}`] = vars[1]

            } else {
                this.filters.push(`#_${nindex} ${action} :_${vindex}`)
                values[`:_${vindex++}`] = value[action]
            }
        } else {
            this.filters.push(`#_${nindex} = :_${vindex}`)
            values[`:_${vindex++}`] = value
        }
        names[`#_${nindex++}`] = attribute
        this.nindex = nindex
        this.vindex = vindex
    }

    /*
        Add key for delete, get or update
     */
    addKey(field, value) {
        this.key[field.attribute] = value
    }

    /*
        Add KeyConditionExpressions for find. Conditions will be joined with 'and' when prepared.
     */
    addKeys(field, value) {
        let {keys, names, nindex, op, values, vindex} = this

        if (typeof value == 'object' && Object.keys(value).length > 0) {
            let [action,vars] = Object.entries(value)[0]
            if (KeyOperators.indexOf(action) < 0) {
                throw new Error(`Invalid KeyCondition operator "${action}"`)
            }
            if (action == 'begins_with' || action == 'begins') {
                keys.push(`begins_with(#_${nindex}, :_${vindex})`)
                values[`:_${vindex++}`] = vars

            } else if (action == 'between') {
                keys.push(`between(#_${nindex}, :_${vindex}, :_${vindex+1})`)
                values[`:_${vindex++}`] = vars[0]
                values[`:_${vindex++}`] = vars[1]

            } else {
                keys.push(`#_${nindex} ${action} :_${vindex}`)
                values[`:_${vindex++}`] = value[action]
            }
        } else {
            keys.push(`#_${nindex} = :_${vindex}`)
            values[`:_${vindex++}`] = value
        }
        names[`#_${nindex++}`] = field.attribute
        this.nindex = nindex
        this.vindex = vindex
    }

    addUpdate(field, value) {
        let {names, nindex, params, updates, values, vindex} = this
        if (field.isIndexed && (field.attribute == this.hash || field.attribute == this.sort)) {
            return
        }
        if (params.add || params.remove || params.delete) {
            return
        }
        if (field.attribute != this.hash && field.attribute != this.sort && this.properties[field.name] === undefined) {
            //  Only update values explicitly provided by caller in properties.
            //  Unless params.updateContext requires context properties to be updated too.
            if (this.params.updateIndexes !== true) {
                return
            }
        }
        updates.push(`#_${nindex} = :_${vindex}`)
        names[`#_${nindex++}`] = field.attribute
        values[`:_${vindex++}`] = value
        this.nindex = nindex
        this.vindex = vindex
    }

    addUpdates() {
        let {names, nindex, params, updates, values, vindex} = this
        if (params.add) {
            for (let [key, value] of Object.entries(params.add)) {
                updates.push(`#_${nindex} :_${vindex}`)
                names[`#_${nindex++}`] = key
                values[`:_${vindex++}`] = value
            }

        } else if (params.remove) {
            if (!Array.isArray(params.remove)) {
                params.remove = [params.remove]
            }
            for (let field of params.remove) {
                updates.push(`#_${nindex}`)
                names[`#_${nindex++}`] = field
            }

        } else if (params.delete) {
            for (let [key, value] of Object.entries(params.delete)) {
                updates.push(`#_${nindex} :_${vindex}`)
                names[`#_${nindex++}`] = key
                values[`:_${vindex++}`] = value
            }
        }
        this.nindex = nindex
        this.vindex = vindex
    }

    selectIndex(indexes, params) {
        let op = this.op
        let index = indexes.primary
        if (params.index) {
            if (params.index != 'primary') {
                index = indexes[params.index]
                if (op != 'find' && op != 'scan') {
                    //  Non primary indexes only supported with find/scan
                    this.fallback = true
                }
            }
        }
        return index
    }

    /*
        Create the Dynamo command parameters
     */
    prepare() {
        let {conditions, fields, filters, key, keys, hash, names, op, params, sort, values} = this

        if (this.fallback) {
            return null
        }
        if (key == null && values[hash] == null && op != 'scan') {
            throw new Error(`dynamo: Cannot find hash key for "${op}"`, {values})
        }
        if (op == 'get' || op == 'delete' || op == 'update') {
            if (key == null) {
                return null
            }
        }
        if (params.preFormat) {
            params.preFormat(model)
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
            } else if (op == 'update') {
                args = { Item: values }
            }
        } else {
            args = {
                ConditionExpression: conditions.length ? this.and(conditions) : undefined,
                ExpressionAttributeNames: namesLen > 0 ? names : undefined,
                ExpressionAttributeValues: (namesLen > 0 && valuesLen > 0) ? values : undefined,
                FilterExpression: filters.length ? this.and(filters) : undefined,
                KeyConditionExpression: keys.length ? keys.join(' and ') : undefined,
                ProjectionExpression: fields.length ? fields.join(', ') : undefined,
                TableName: this.tableName
            }
            if (params.metrics) {
                args.ReturnConsumedCapacity = params.capacity || 'TOTAL'    // INDEXES | TOTAL | NONE
                args.ReturnItemCollectionMetrics || 'SIZE'                  // SIZE | NONE
            }
            if (op == 'put') {
                args.Item = values
                args.ReturnValues = params.return || 'NONE'

            } else if (op == 'update') {
                args.ReturnValues = params.return || 'ALL_NEW'
                if (this.updates.length) {
                    args.UpdateExpression = `${this.getAction(params)} ${this.updates.join(', ')}`
                }
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
                args.ScanIndexForward = params.reverse ? false : true
                if (params.start) {
                    args.ExclusiveStartKey = this.table.marshall(params.start)
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
        args = Object.fromEntries(Object.entries(args).filter(([_, v]) => v != null))
        if (params.postFormat) {
            args = params.postFormat(model, args)
        }
        return args
    }

    /*
        Expand string template in field.value by substituting ${variable} values
        from properties and context.
     */
    template(field, properties, ...contexts) {
        let s = field.value
        contexts.push(properties)

        if (s == null) {
            let context = contexts.find(context => context[field.name] !== undefined)
            return context ? context[field.name] : undefined
        } else if (typeof s == 'function') {
            return s(field.name, properties, ...contexts)
        }
        for (let context of contexts) {
            if (s.indexOf('${') < 0) {
                break
            }
            s = s.replace(/\${(.*?)}/g, (match, varName) => {
                if (context[varName] !== undefined) {
                    return context[varName]
                } else {
                    return match
                }
            })
        }
        /*
            Remaining template variable.
            If field is the sort key and doing find, then use sort key prefix and begins_with, (provide no where clause).
         */
        if (s.indexOf('${') >= 0) {
            if (field.attribute == this.sort) {
                if (this.op == 'find' && !this.params.where) {
                    s = s.replace(/\${(.*?)}/g, '')
                    let sep = this.delimiter
                    s = s.replace(RegExp(`${sep}${sep}+$`, 'g'), '')
                    if (s) {
                        return {begins: s}
                    }
                }
            }
            return undefined
        }
        return s
    }

    removeEmptyStrings(field, obj) {
        let result
        if (obj !== null && typeof obj == 'object') {
            result = Array.isArray(obj) ? [] : {}
            for (let [key, value] of Object.entries(obj)) {
                if (typeof value == 'object') {
                    result[key] = this.removeEmptyStrings(field, value)
                } else if (value === null && field.nulls !== true) {
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

    getFieldValues() {
        return this.fieldValues
    }

    and(terms) {
        if (terms.length == 1) {
            return terms.join('')
        }
        return terms.map(t => `(${t})`).join(' and ')
    }

    getAction(params) {
        if (params.add) {
            return 'add'
        } else if (params.remove) {
            return 'remove'
        } else if (params.delete) {
            return 'delete'
        }
        return 'set'
    }
}
