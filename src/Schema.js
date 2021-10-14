/*
    Schema.js - Utility class to manage schemas
 */

import {Model} from './Model.js'

const GenericModel = '_Generic'
const MigrationModel = '_Migration'
const SchemaModel = '_Schema'
const UniqueModel = '_Unique'
const SchemaKey = '_schema'
const UniqueKey = '_unique'
const SchemaFormat = 'onetable:1.0.0'

export class Schema {

    constructor(table, schema) {
        this.table = table
        this.params = table.getParams()
        this.setSchema(schema)
        if (this.indexes) {
            this.createStandardModels()
        }
    }

    getCurrentSchema() {
        // return schema
        let schema = this.table.merge({}, this.schema, {params: this.params})
        return this.transformSchemaForWrite(schema)
    }

    setSchema(schema) {
        this.models = {}
        if (!schema) {
            return
        }
        if (!schema.version) {
            throw new Error('Schema is missing a version')
        }
        let {models, indexes, params} = schema
        if (!models) {
            models = {}
        }
        this.indexes = indexes

        //  Must set before creating models
        if (params) {
            this.table.setParams(params)
        }
        for (let [name, model] of Object.entries(models)) {
            if (name == SchemaModel || name == MigrationModel) continue
            this.models[name] = new Model(this.table, name, {fields: model, schema: this})
        }
        this.createStandardModels()
        this.schema = schema
    }

    createStandardModels() {
        this.createUniqueModel()
        this.createGenericModel()
        this.createSchemaModel()
        this.createMigrationModel()
    }

    /*
        Model for unique attributes
     */
    createUniqueModel() {
        let {indexes, schema, table} = this
        let primary = indexes.primary
        /*
            LEGACY 1.7.4 - remove in 2.0.0
            Set legacyUnique to the PK separator. Previously was hard coded to ':' without a 'unique' prefix.
            Now, use the delimiter with a unique prefix.
            Defaults to be ':' in 1.7.
        */
        let sep = this.params.legacyUnique || table.delimiter
        let fields = {
            [primary.hash]: { type: String, value: `${UniqueKey}${sep}\${` + primary.hash + '}'},
        }
        if (primary.sort) {
            fields[primary.sort] = { type: String, value: `${UniqueKey}${sep}`}
        }
        this.uniqueModel = new Model(table, UniqueModel, {
            fields,
            timestamps: false,
            schema: this,
        })
    }

    /*
        Model for genric low-level API access. Generic models allow reading attributes that are not defined on the schema.
     */
    createGenericModel() {
        let {indexes, schema, table} = this
        let primary = indexes.primary
        let fields = {[primary.hash]: {type: String}}
        if (primary.sort) {
            fields[primary.sort] = {type: String}
        }
        this.genericModel = new Model(table, GenericModel, {
            fields,
            timestamps: false,
            generic: true,
            schema: this,
        })
    }

    createSchemaModel() {
        let {indexes, schema, table} = this
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
        this.models[SchemaModel] = new Model(table, SchemaModel, {fields, delimiter, schema: this})
    }

    createMigrationModel() {
        let {indexes, schema} = this
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
        this.models[MigrationModel] = new Model(this.table, MigrationModel, {fields, indexes, delimiter, schema: this})
    }

    addModel(name, fields) {
        this.models[name] = new Model(this.table, name, {indexes: this.schema.indexes, fields, schema: this})
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
        this.indexes = indexes

        this.createStandardModels()
        return indexes
    }

    /*
        Prepare for persisting the schema. Convert types and regexp to strings.
    */
    transformSchemaForWrite(schema) {
        let params = schema.params || this.params
        for (let [name, model] of Object.entries(schema.models)) {
            for (let [fname, field] of Object.entries(model)) {
                if (field.validate && field.validate instanceof RegExp) {
                    schema.models[name][fname].validate = `/${field.validate.source}/${field.validate.flags}`
                }
                let type = (typeof field.type == 'function') ? field.type.name : field.type
                field.type = type.toLowerCase()
            }
            /*
            delete model[params.typeField]
            if (params.timestamps) {
                delete model[params.createdField]
                delete model[params.updatedField]
            } */
        }
        // delete schema.models[SchemaModel]
        // delete schema.models[MigrationModel]
        return schema
    }

    /*
        Replace Schema and Migration models, timestamp fields and type field
    */
    transformSchemaAfterRead(schema) {
        if (!schema.name) {
            schema.name == 'Current'
        }
        schema.models[SchemaModel] = this.schemaFields
        schema.models[MigrationModel] = this.migrationFields

        let params = schema.params || this.params
        for (let [modelName, mdef] of Object.entries(schema.models)) {
            if (params.timestamps) {
                mdef[params.createdField] = {name: params.createdField, type: 'date'}
                mdef[params.updatedField] = {name: params.updatedField, type: 'date'}
            }
            mdef[params.typeField] = {name: params.typeField, type: 'string', required: true}
        }
        if (params.typeField != this.table.typeField) {
            delete schema[this.table.typeField]
        }
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
        let schema = await this.table.getItem(params, {hidden: true, parse: true})
        return this.transformSchemaAfterRead(schema)
    }

    async readSchemas() {
        let indexes = this.indexes || await this.getKeys()
        let primary = indexes.primary
        let params = {
            [primary.hash]: `${SchemaKey}:`
        }
        let schemas = await this.table.queryItems(params, {hidden: true, parse: true})
        for (let [index, schema] of Object.entries(schemas)) {
            schemas[index] = this.transformSchemaAfterRead(schema)
        }
        return schemas
    }

    async removeSchema(schema) {
        let model = this.getModel(SchemaModel)
        await model.remove(schema)
    }

    /*
        Update the schema model saved in the database _Schema model.
        NOTE: this does not update the current schema used by the Table instance.
    */
    async saveSchema(schema) {
        if (schema) {
            schema = this.table.merge({}, schema)
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
        //  REPAIR no name
        if (!schema.name) {
            schema.name = 'Current'
        }
        schema.version = schema.version || '0.0.1'
        schema.format = SchemaFormat

        let model = this.getModel(SchemaModel)
        return await model.update(schema, {exists: null})
    }

}
