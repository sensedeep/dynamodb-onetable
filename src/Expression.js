/*
    Expression.js - DynamoDB API command builder
*/

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
        //  Facets of the API call parsed into Dynamo conditions, filters, key, keys, updates...
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
        this.delimiter = model.delimiter        //  Composite sort key delimiter
        this.tableName = model.tableName

        /*
            Find the index for this expression. Then store the attribute names for the index.
         */
        this.index = this.selectIndex(model.indexes, params)
        let fields = model.block.fields

        /*
            Get the request index hash/sort attributes
         */
        this.hash = this.index.hash
        this.sort = this.index.sort
    }

    prepare() {
        let op = this.op
        let fields = this.model.block.fields
        for (let [name, value] of Object.entries(this.properties)) {
            if (fields[name]) {
                this.add(fields[name], value)
            }
        }
        //  Emit mapped attributes. 'mapped' is created when adding fields that are mapped.
        if (this.mapped) {
            for (let [att, props] of Object.entries(this.mapped)) {
                if (Object.keys(props).length != this.model.mappings[att].length) {
                    throw new Error(`Missing properties for mapped data field "${att}" in model "${this.model.name}"`)
                }
            }
            for (let [k,v] of Object.entries(this.mapped)) {
                this.add({attribute: [k], name: k, filter: false}, v, this.properties)
            }
        }
        if (op == 'find') {
            this.addFilters()

        } else if (op == 'delete' || op == 'put' || op == 'update') {
            this.addConditions(op)

        } else if (op == 'scan') {
            this.addFilters()
            //  Setup scan filters for properties outside the model. Use the property name here as there can't be a mapping.
            for (let [name, value] of Object.entries(this.properties)) {
                if (fields[name] == null && value != null) {
                    this.addFilter(name, value)
                }
            }
        }
        if (this.params.fields) {
            for (let name of this.params.fields) {
                let att = fields[name].attribute[0]
                this.project.push(`#_${this.addName(att)}`)
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
        //  TODO - review all mappings
        if (attribute.length > 1) {
            //  Mapped (packed) field
            let mapped = this.mapped
            let [k,v] = attribute
            mapped[k] = mapped[k] || {}
            mapped[k][v] = value
            properties[k] = value
            return
        }
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
                    this.addFilter(att, value)
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
        if (op == 'update') {
            this.addUpdates()
        }
        if (params.where && op == 'delete' /* || op == 'update') */) {
            conditions.push(this.expand(params.where))
        }
    }

    /*
        Expand a where/set expression. Replace: ${var} and {value} tokens.
     */
    expand(where) {
        let fields = this.model.block.fields
        where = where.replace(/\${(.*?)}/g, (match, varName) => {
            let field = fields[varName]
            let att = field ? field.attribute[0] : varName
            return `#_${this.addName(att)}`
        })
        where = where.replace(/{(.*?)}/g, (match, value) => {
            let index
            if (value.match(/^\d+$/)) {
                index = this.addValue(+value)
            } else {
                let matched = value.match(/^"(.*)"$/)
                if (matched) {
                    index = this.addValue(matched[1])
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
                    throw new Error(`Invalid KeyCondition operator "${action}"`)
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
        let {params, properties, updates} = this
        let att = field.attribute[0]
        if (att == this.hash || att == this.sort) {
            return
        }
        if (field.name == this.model.typeField) {
            return
        }
        if (params.add && params.add.indexOf(field.name) >= 0) {
            return
        }
        if (params.delete && params.delete.indexOf(field.name) >= 0) {
            return
        }
        if (params.remove && params.remove.indexOf(field.name) >= 0) {
            return
        }
        if (field.isIndexed && params.updateIndexes !== true) {
            return
        }
        updates.set.push(`#_${this.addName(att)} = :_${this.addValue(value)}`)
    }

    addUpdates() {
        let {params, updates} = this
        let fields = this.model.block.fields
        if (params.add) {
            for (let [key, value] of Object.entries(params.add)) {
                let att = fields[key].attribute[0]
                updates.add.push(`#_${this.addName(att)} :_${this.addValue(value)}`)
            }

        } else if (params.delete) {
            for (let [key, value] of Object.entries(params.delete)) {
                let att = fields[key].attribute[0]
                updates.delete.push(`#_${this.addName(att)} :_${this.addValue(value)}`)
            }

        } else if (params.remove) {
            if (!Array.isArray(params.remove)) {
                params.remove = [params.remove]
            }
            for (let key of params.remove) {
                let att = fields[key].attribute[0]
                updates.remove.push(`#_${this.addName(att)}`)
            }

        } else if (params.set) {
            for (let [key, value] of Object.entries(params.set)) {
                /* nested
                let target = []
                for (let prop of key.split('.')) {
                    let att = fields[key].attribute[0]
                    target.push(`#_${this.addName(prop)}`)
                }
                target = target.join('.')
                updates.set.push(`${target} = ${this.expand(value)}`)
                */
                let att = fields[key].attribute[0]
                updates.set.push(`${att} = ${this.expand(value)}`)
            }
        }
    }

    selectIndex(indexes) {
        let op = this.op
        let index = indexes.primary
        if (this.params.index) {
            if (this.params.index != 'primary') {
                index = indexes[this.params.index]
            }
        }
        return index
    }

    /*
        Create the Dynamo command parameters
     */
    command() {
        let {conditions, filters, key, keys, hash, model, names, op, params, project, sort, values} = this

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
            } else if (op == 'put') {
                args = { Item: values }
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
            if (params.metrics) {
                args.ReturnConsumedCapacity = params.capacity || 'TOTAL'    // INDEXES | TOTAL | NONE
                args.ReturnItemCollectionMetrics || 'SIZE'                  // SIZE | NONE
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

    and(terms) {
        if (terms.length == 1) {
            return terms.join('')
        }
        return terms.map(t => `(${t})`).join(' and ')
    }

    addName(name) {
        let index = this.namesMap[name]
        if (index == null) {
            index = this.nindex++
            this.names[`#_${index}`] = name
            this.namesMap[name] = index
        }
        return index
    }

    addValue(value) {
        let index
        if (value && typeof value != 'object') {
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
