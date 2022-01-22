/*
    Schema.js - Utility class to manage schemas
 */

import { OneTableArgError } from './Error.js'
import { Model } from './Model.js'

const GenericModel = '_Generic'
const MigrationModel = '_Migration'
const SchemaModel = '_Schema'
const UniqueModel = '_Unique'
const MigrationKey = '_migration'
const SchemaKey = '_schema'
const SchemaFormat = 'onetable:1.1.0'

export class Schema {

    constructor(table, schema) {
        this.table = table
        table.schema = this
        Object.defineProperty(this, 'table', { enumerable: false })
        this.params = table.getSchemaParams()
        this.setSchemaInner(schema)
    }

    getCurrentSchema() {
        if (this.definition) {
            let schema = this.table.assign({}, this.definition, { params: this.params })
            return this.transformSchemaForWrite(schema)
        }
        return null
    }

    /* private */
    setSchemaInner(schema) {
        this.models = {}
        this.indexes = null
        if (schema) {
            this.validateSchema(schema)
            this.definition = schema
            let { models, indexes, params } = schema
            if (!models) {
                models = {}
            }
            this.indexes = indexes
            //  Must set before creating models
            if (params) {
                this.table.setSchemaParams(params)
            }
            for (let [name, model] of Object.entries(models)) {
                if (name == SchemaModel || name == MigrationModel) continue
                this.models[name] = new Model(this.table, name, { fields: model })
            }
            this.createStandardModels()
        }
        return this.indexes
    }

    /*
        Set the schema to use. If undefined, get the table keys.
    */
    async setSchema(schema) {
        if (schema) {
            this.setSchemaInner(schema)
        } else {
            await this.getKeys()
        }
        return this.indexes
    }

    //  Start of a function to better validate schemas. More to do.
    validateSchema(schema) {
        let { indexes } = schema
        if (!schema.version) {
            throw new Error('Schema is missing a version')
        }
        if (!schema.indexes) {
            throw new Error('Schema is missing indexes')
        }
        let primary = schema.indexes.primary
        if (!primary) {
            throw new Error('Schema is missing a primary index')
        }
        let hash = primary.hash
        let gsis = Object.values(indexes).filter(i => i.hash != hash)
        let lsis = Object.values(indexes).filter(i => i.hash == hash)
        if (lsis.length > 5) {
            throw new Error('Schema has too many LSIs')
        }
        if (gsis.length > 20) {
            throw new Error('Schema has too many GSIs')
        }
        for (let [name, index] of Object.entries(schema.indexes)) {
            if (name != 'primary') {
                if (index.type == 'local') {
                    index.hash = primary.hash
                    if (index.hash != indexes.primary.hash) {
                        throw new OneTableArgError(`LSI "${name}" should not define a hash attribute that is different to the primary index`)
                    }
                } else if (index.hash == primary.hash) {
                    index.type = 'local'
                    console.warn(`Must use explicit "type": "local" in "${name}" LSI index definitions`)

                } else if (!index.hash) {
                    index.type = 'local'
                    console.warn(`Must use explicit "type": "local" in "${name}" LSI index definitions`)
                }
                if (index.type == 'local') {
                    if (index.sort == null) {
                        throw new OneTableArgError('LSIs must define a sort attribute')
                    }
                    if (index.project) {
                        throw new OneTableArgError('Unwanted project definition for LSI')
                    }
                }
            }
        }
    }

    createStandardModels() {
        this.createUniqueModel()
        this.createGenericModel()
        this.createSchemaModel()
        this.createMigrationModel()
    }

    /*
        Model for unique attributes. Free standing and not in models[]
     */
    createUniqueModel() {
        let { indexes, table } = this
        let primary = indexes.primary
        let fields = {
            [primary.hash]: { type: String }
        }
        if (primary.sort) {
            fields[primary.sort] = { type: String }
        }
        this.uniqueModel = new Model(table, UniqueModel, { fields, timestamps: false })
    }

    /*
        Model for genric low-level API access. Generic models allow reading attributes that are not defined on the schema.
        NOTE: there is not items created based on this model.
     */
    createGenericModel() {
        let { indexes, table } = this
        let primary = indexes.primary
        let fields = { [primary.hash]: { type: String } }
        if (primary.sort) {
            fields[primary.sort] = { type: String }
        }
        this.genericModel = new Model(table, GenericModel, { fields, timestamps: false, generic: true })
    }

    createSchemaModel() {
        let { indexes, table } = this
        let primary = indexes.primary
        let fields = this.schemaModelFields = {
            [primary.hash]: { type: 'string', required: true, value: `${SchemaKey}` },
            format: { type: 'string', required: true },
            indexes: { type: 'object', required: true },
            name: { type: 'string', required: true },
            models: { type: 'object', required: true },
            params: { type: 'object', required: true },
            queries: { type: 'object', required: true },
            version: { type: 'string', required: true }
        }
        if (primary.sort) {
            fields[primary.sort] = { type: 'string', required: true, value: `${SchemaKey}:\${name}` }
        }
        this.models[SchemaModel] = new Model(table, SchemaModel, { fields })
    }

    createMigrationModel() {
        let { indexes} = this
        let primary = indexes.primary
        let fields = this.migrationModelFields = {
            [primary.hash]: { type: 'string', value: `${MigrationKey}` },
            date: { type: 'date', required: true },
            description: { type: 'string', required: true },
            path: { type: 'string', required: true },
            version: { type: 'string', required: true }
        }
        if (primary.sort) {
            fields[primary.sort] = { type: 'string', value: `${MigrationKey}:\${version}` }
        }
        this.models[MigrationModel] = new Model(this.table, MigrationModel, { fields, indexes })
    }

    addModel(name, fields) {
        this.models[name] = new Model(this.table, name, { indexes: this.indexes, fields })
    }

    listModels() {
        return Object.keys(this.models)
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
            if (name == UniqueModel) {
                return this.uniqueModel
            }
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

    async getKeys(refresh = false) {
        if (this.indexes && !refresh) {
            return this.indexes
        }
        let info = await this.table.describeTable()
        let indexes = { primary: {} }
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
        this.indexes = indexes
        this.createStandardModels()
        return indexes
    }

    setDefaultParams(params) {
        if (params.typeField == null) {
            params.typeField = '_type'
        }
        if (params.isoDates == null) {
            params.isoDates = false
        }
        if (params.nulls == null) {
            params.nulls = false
        }
        if (params.hidden == null) {
            params.hidden = false
        }
        if (params.timestamps == null) {
            params.timestamps = false
        }
        return params
    }

    /*
        Prepare for persisting the schema. Convert types and regexp to strings.
    */
    transformSchemaForWrite(schema) {
        let params = this.setDefaultParams(schema.params || this.params)
        for (let [name, model] of Object.entries(schema.models)) {
            for (let [fname, field] of Object.entries(model)) {
                if (field.validate && field.validate instanceof RegExp) {
                    schema.models[name][fname].validate = `/${field.validate.source}/${field.validate.flags}`
                }
                let type = (typeof field.type == 'function') ? field.type.name : field.type
                field.type = type.toLowerCase()
                delete field[params.typeField]
                if (field.uuid) {
                    field.generate = field.generate || field.uuid
                    delete field.uuid
                }
            }
        }
        return schema
    }

    /*
        Replace Schema and Migration models, timestamp fields and type field
    */
    transformSchemaAfterRead(schema) {
        if (!schema) {
            return null
        }
        if (!schema.name) {
            schema.name == 'Current'
        }
        //  Add internal models
        schema.models[SchemaModel] = this.schemaModelFields
        schema.models[MigrationModel] = this.migrationModelFields

        let params = schema.params || this.params
        for (let mdef of Object.values(schema.models)) {
            if (params.timestamps) {
                let createdField = params.createdField || 'created'
                let updatedField = params.updatedField || 'updated'
                mdef[createdField] = { name: createdField, type: 'date' }
                mdef[updatedField] = { name: updatedField, type: 'date' }
            }
            mdef[params.typeField] = { name: params.typeField, type: 'string', required: true }

            for (let [, field] of Object.entries(mdef)) {
                //  DEPRECATE
                if (field.uuid) {
                    console.warn(`OneTable: Using deprecated field "uuid". Use "generate" instead.`)
                    field.generate = field.generate || field.uuid
                }
            }
        }
        this.setDefaultParams(params)
        /*
        if (params.typeField != this.table.typeField) {
            delete schema[this.table.typeField]
        } */
        return schema
    }

    /*
        Read the current schema saved in the table
    */
    async readSchema() {
        let indexes = this.indexes || await this.getKeys()
        let primary = indexes.primary
        let params = {
            [primary.hash]: SchemaKey
        }
        if (primary.sort) {
            params[primary.sort] = `${SchemaKey}:Current`
        }
        let schema = await this.table.getItem(params, { hidden: true, parse: true })
        return this.transformSchemaAfterRead(schema)
    }

    async readSchemas() {
        let indexes = this.indexes || await this.getKeys()
        let primary = indexes.primary
        let params = {
            [primary.hash]: `${SchemaKey}`
        }
        let schemas = await this.table.queryItems(params, { hidden: true, parse: true })
        for (let [index, schema] of Object.entries(schemas)) {
            schemas[index] = this.transformSchemaAfterRead(schema)
        }
        return schemas
    }

    async removeSchema(schema) {
        if (!this.indexes) {
            await this.getKeys()
        }
        let model = this.getModel(SchemaModel)
        await model.remove(schema)
    }

    /*
        Update the schema model saved in the database _Schema model.
        NOTE: this does not update the current schema used by the Table instance.
    */
    async saveSchema(schema) {
        if (!this.indexes) {
            await this.getKeys()
        }
        if (schema) {
            schema = this.table.assign({}, schema)
            if (!schema.params) {
                schema.params = this.params
            }
            if (!schema.models) {
                schema.models = {}
            }
            if (!schema.indexes) {
                schema.indexes = this.indexes || await this.getKeys()
            }
            if (!schema.queries) {
                schema.queries = {}
            }
            schema = this.transformSchemaForWrite(schema)
        } else {
            schema = this.getCurrentSchema()
        }
        if (!schema) {
            throw new Error('No schema to save')
        }
        if (!schema.name) {
            schema.name = 'Current'
        }
        schema.version = schema.version || '0.0.1'
        schema.format = SchemaFormat

        let model = this.getModel(SchemaModel)
        return await model.update(schema, { exists: null })
    }
}
