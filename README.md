# DynamoDB OneTable

[![npm](https://img.shields.io/npm/v/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)
[![npm](https://img.shields.io/npm/l/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)

![OneTable](https://www.sensedeep.com/images/ring.png)

DynamoDB OneTable (OneTable) is an access library for [DynamoDB](https://aws.amazon.com/dynamodb/) applications that use one-table design patterns with NodeJS.

OneTable strives to make dealing with DynamoDB and one-table design patterns dramatically easier while still providing easy access to the full DynamoDB API.

OneTable is not an [ORM](https://en.wikipedia.org/wiki/Object%E2%80%93relational_mapping). Rather it provides a convenience API over the DynamoDB APIs. It offers a flexible high-level API that supports one-table design patterns and eases the tedium working with the standard, unadorned DynamoDB API.

OneTable can invoke DynamoDB APIs or it can be used as a generator to create DynamoDB API parameters that you can save or execute yourself.

OneTable is not opinionated as much as possible and provides hooks for you to customize requests and responses to suit your exact needs.

## History and Credits

After watching the famous [Rick Houlihan DynamoDB ReInvent Video](https://www.youtube.com/watch?v=6yqfmXiZTlM), we changed how we used DynamoDB for our [SenseDeep](https://www.sensedeep.com) serverless troubleshooter to use one-table design patterns. However, we found the going tough and thus this library was created to make our one-table patterns less tedious, more natural and a joy with DynamoDB.

OneTable is used by the [SenseDeep Serverless Troubleshooter](https://www.sensedeep.com/) for all DynamoDB access.

A big thank you to [Alex DeBrie](https://www.alexdebrie.com/about/) and his excellent [DynamoDB Book](https://www.dynamodbbook.com/). Highly recommended. And thanks also to [Jeremy Daly](https://www.jeremydaly.com/about/) for his [Off by None Blog](https://offbynone.io/) blog, posts and his [DynamoDB Toolbox](https://github.com/jeremydaly/dynamodb-toolbox) which pointed out a better way for us to do a number of things.

## OneTable Features

* Schema supported one-table access to DynamoDB APIs.
* Efficient storage and access of multiple entities in a single DynamoDB table.
* High level API with type marshaling, validations, and extended query capability for get/delete/update operations.
* Bidirectional conversion of DynamoDB types to Javascript types.
* Option to invoke DynamoDB or simply generate API parameters.
* Generation of Conditional, Filter, Key and Update expressions.
* Schema item definitions for attribute types, default values, enums and validations.
* Powerful field level validations with required and transactional unique attributes.
* Easy parameterization of filter and conditional queries.
* Multi-page response aggregation.
* Compound and templated key management.
* Encrypted fields.
* Support for Batch, Transactions, GSI, LSI indexes.
* Hooks to modify DynamoDB requests and responses and for item/attribute migrations.
* Controllable logging to see exact parameter, data and responses.
* Simple, easy to read source to modify (< 1000 lines).
* Safety options to prevent "rm -fr *".
* No module dependencies.

## Related Packages

If you require DynamoDB migration support, consider the
[OneTable CLI](https://www.npmjs.com/package/onetable-cli) which provides command line migration control and the [OneTable Migrate](https://www.npmjs.com/package/onetable-migrate) library for inclusion in your services to manage database migrations.

## Installation

    npm i dynamodb-onetable

## Quick Tour

Import the library:

```javascript
import {Model, Table} from 'dynamodb-onetable'
```

Initialize your your Dynamo table instance and define your models via a schema.

```javascript
const table = new Table({
    client: DocumentClientInstance,
    name: 'MyTable',
    schema: MySchema,
})
```

Schemas look like this and define how items will be stored in your database.

```javascript
const MySchema = {
    indexes: {
        primary: { hash: 'pk', sort: 'sk' }
        gs1:     { hash: 'gs1pk', sort: 'gs1sk' }
    },
    models: {
        Account: {
            pk:          { value: 'account:${name}' },
            sk:          { value: 'account:' },
            id:          { type: String, uuid: true, validate: /^[0-9A-F]{32}$/i, },
            name:        { type: String, required: true, }
            status:      { type: String, default: 'active' },
            zip:         { type: String },
        },
        User: {
            pk:          { value: 'account:${accountName}' },
            sk:          { value: 'user:${email}', validate: EmailRegExp },
            id:          { type: String },
            accountName: { type: String },
            email:       { type: String, required: true },
            firstName:   { type: String, required: true },
            lastName:    { type: String, required: true },
            username:    { type: String, required: true },
            role:        { type: String, enum: ['user', 'admin'], required: true, default: 'user' }
            balance:     { type: Number, default: 0 },

            gs1pk:       { value: 'user-email:${email}' },
            gs1sk:       { value: 'user:' },
        }
    }
}
```

Alternatively, you can define models one by one:

```javascript
const Card = new Model(table, {
    name: 'Card',
    fields: { /* Model schema field definitions */ }
})
```

To create an item:

```javascript
let account = await Account.create({
    id: '8e7bbe6a-4afc-4117-9218-67081afc935b',
    name: 'Acme Airplanes'
})
```

This will write the following to DynamoDB:
```javascript
{
    pk:         'account:8e7bbe6a-4afc-4117-9218-67081afc935b',
    sk:         'account:98034',
    id:         '8e7bbe6a-4afc-4117-9218-67081afc935b',
    name:       'Acme Airplanes',
    status:     'active',
    zip:        98034,
    created:    1610347305510,
    updated:    1610347305510,
}
```

Get an item:

```javascript
let account = await Account.get({
    id: '8e7bbe6a-4afc-4117-9218-67081afc935b', zip
})
```

which will return:

```javascript
{
    id:       '8e7bbe6a-4afc-4117-9218-67081afc935b',
    name:     'Acme Airplanes',
    status:   'active',
    zip:      98034,
}
```

To use a secondary index:

```javascript
let user = await User.get({email: 'user@example.com'}, {index: 'gs1'})
```

To find a set of items:

```javascript
let users = await User.find({accountId: account.id})

let adminUsers = await User.find({accountId: account.id, role: 'admin'})

let adminUsers = await User.find({accountId: account.id}, {
    where: '${balance} > {100.00}'
})
```

To update an item:

```javascript
await User.update({id: userId, balance: 50})
await User.update({id: userId}, {add: {balance: 10.00}})
```

To do a transactional update:

```javascript
let transaction = {}
await Account.update({id: account.id, status: 'active'}, {transaction})
await User.update({id: user.id, role: 'user'}, {transaction})
await table.transaction('write', transaction)
```

## Why OneTable?

DynamoDB is a great [NoSQL](https://en.wikipedia.org/wiki/NoSQL) database that comes with a learning curve. Folks migrating from SQL often have a hard time adjusting to the NoSQL paradigm and especially to DynamoDB which offers exceptional scalability but with a fairly low-level API.

The standard DynamoDB API requires a lot of boiler-plate syntax and expressions. This is tedious to use and can unfortunately can be error prone at times. I doubt that creating complex attribute type expressions, key, filter, condition and update expressions are anyone's idea of a good time.

Net/Net: it is not easy to write terse, clear, robust Dynamo code for one-table patterns.

Our goal with OneTable for DynamoDB was to keep all the good parts of DynamoDB and to remove the tedium and provide a more natural, "Javascripty" way to interact with DynamoDB without obscuring any of the power of DynamoDB itself.

## Table Class

The `Table` class is the top-most OneTable class and it represents a single DynamoDB table. The table class configures access to a DynamoDB table, defines the model (entity) schema, indexes, crypto and defaults. You can create a single `Table` instance or if you are working with multiple tables, you can create one instance per table.

The Table class provides APIs for transactions and batch API operations. While most access to the database is via the `Model` methods, the Table class also provides a convenience API to wrap the `Model` methods so you can specify the required model by a string name. The is helpful for factory design patterns.

### Table Examples

```javascript
import {Table} from 'dynamodb-onetable'

const table = new Table({
    client: DocumentClientInstance,
    name: 'MyTable',
    schema: Schema,
})

//  Fetch an item collection for Acme
let items = await table.queryItems({pk: 'account:AcmeCorp'})

//  Fetch an account by the ID which is used to create the primary key value
let account = await table.get('Account', {id})

//  Update Account and User in a transaction
let transaction = {}
await table.update('Account', {id: account.id, status: 'active'}, {transaction})
await table.update('User', {id: user.id, role: 'user'}, {transaction})
await table.transaction('write', transaction)

//  Fetch an Account using the Account model
let account = table.find('Account', {id})
```

### Table Constructor

The Table constructor takes a parameter of type `object` with the following properties:

| Property | Type | Description |
| -------- | :--: | ----------- |
| client | `DocumentClient` | An AWS [DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html) instance |
| crypto | `object` | Optional properties defining a crypto configuration to encrypt properties |
| createdField | `string` | Name of the "created" timestamp attribute |
| delimiter | `string` | Composite sort key delimiter (default ':') |
| logger | `object` | Logging function(tag, message, properties). Tag is data.info|error|trace|exception. |
| hidden | `boolean` | Hide key attributes in Javascript properties. Default false. |
| name | `string` | yes | The name of your DynamoDB table |
| nulls | `boolean` | Store nulls in database attributes. Default false. |
| schema | `string` | Definition of your DynamoDB indexes and models |
| timestamps | `boolean` | Make "created" and "updated" timestamps in items |
| typeField | `string` | Name of the "type" attribute. Default to "_type" |
| uuid | `string` | Function to create a UUID if field schema requires it |

The `client` property must be an initialized [AWS DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html).

By default, OneTable will not write `null` values to the database. If you set the `nulls` property to true, `null` values will be written via `create` or `update`. You can also define `nulls` on a per-attribute basis via the schema.

#### Crypto

The `crypto` property defines the configuration used to encrypt and decrypt attributes that specify `encrypt: true` in their schema. This is useful as an additional layer of security for passwords, keys and other especially sensitive information. The crypto property should be set to a hash that contains the `cipher` to use and an encryption secret/password.

```javascript
"primary": {
    "cipher": "aes-256-gcm",
    "password": "7d11921f-772f-433d-9575-7a2135496b8f"
}
```

#### Logger

OneTable can log full request parameters and responses to assist you in debugging and understanding how your API requests are being translated to DynamoDB.

The `logger` parameter configures a logging callback that will be invoked as required to log data. The logger function has the signature

```javascript
const table = new Table({
    ...
    logger: (type, message, context) => {
        console.log(tag, message, JSON.stringify)
        console.log(`${new Date}: ${type}, ${message}`)
        console.log(JSON.stringify(context, null, 4) + '\n')

    }
})
```

Where `type` is set to `info`, `error`, `warn`, `exception`, `trace` or `data`. The `message` is a simple String containing a descriptive message. The `context` is a hash of contextual properties regarding the request, response or error.

#### Schema

The `schema` property describes the indexes and models (entities) on your DynamoDB table. Models may be defined via the `schema` or alternatively may be constructed using the `Model` constructor and the `Table.addModel` method.

The valid properties of the `schema` object are:

| Property | Type | Description |
| -------- | :--: | ----------- |
| indexes | `object` | Hash of indexes used by the table |
| models | `object` | Hash of model entities describing the model keys, indexes and attributes |
| migrate | `function` | Hook function to be invoked on reads and writes to migrate data |

#### Indexes

The `schema.indexes` property can contain one or more indexes and must contain the `primary` key. Additional indexes will be defined as Global Secondary Indexes (GSIs) if they contain a `sort` key and as Local Secondary Indexes (LSIs) if they only contain as `hash` key.

```javascript
{
    primary: {
        hash: 'pk',         //  Attribute name of the hash key
        sort: 'sk',
    },
    //  Zero or more global secondary or local secondary indexes
    gs1: {
        hash: 'gs1pk',      //  Omit the hash for an LSI
        sort: 'gs1sk',
    },
    ...
}
```

#### Models

The `schema.models` property contains one or more models with attribute field descriptions. The models collections define the attribute names, types, mappings, validations and other properties. For example:

```javascript
{
    Album: {
        pk:     { value: 'album:${name}' },
        sk:     { value: 'album:' },
        name:   { type: String, required: true, }
        songs:  { type: Number },
    },
    Artist: {
        pk:     { value: 'artist:${name}' },
        sk:     { value: 'artist:' },
        name:   { type: String, required: true, }
    }
}
```

##### Schema Attribute Properties

The following attribute properties are supported:

| Property | Type | Description |
| -------- | :--: | ----------- |
| crypt | `boolean` | Set to true to encrypt the data before writing. |
| default | `string or function` | Default value to use when creating model items or when reading items without a value.|
| enum | `array` | List of valid string values for the attribute. |
| hidden | `boolean` | Set to true to omit the attribute in the returned Javascript results. |
| map | `string` | Map the field value to a different attribute when storing in the database. |
| nulls | `boolean` | Set to true to store null values. Default to table.nulls value. |
| required | `boolean` | Set to true if the attribute is required. |
| transform | `function` | Hook function to be invoked to format and parse the data before reading and writing. |
| type | `Type or string` | Type to use for the attribute. |
| unique | `boolean` | Set to true to enforce uniqueness for this attribute. |
| uuid | `boolean` | Set to true to automatically create a new UUID value for the attribute when creating. |
| validate | `RegExp` | Regular expression to use to validate data before writing. |
| value | `string` | String template to use as the value of the attribute. |

If the `hidden` property is set to true, the attribute will be defined in the DynamoDB database table, but will be omitted in the returned Javascript results.

The `map` property can be used to set an alternate or shorter attribute name when storing in the database. This is useful if mapping attributes from different models onto keys.

If the `default` property is set to a function and no value is provided for the attribute when creating a new item, the `default` function will be invoked to return a value for the attribute. The default signature is:

```javascript
default(model, fieldName, attributes)
```

The `transform` property is used to format data prior to writing into the database and parse it when reading back. This can be useful to convert to more nature Javascript representations in your application. The transform signature is:

```javascript
value = transform(model, operation, name, value)
```

Where `operation` is either `read` or `write`. The `name` argument is set to the field attribute name.

The `type` properties defines the attribute data type. Valid types include: String, Number, Boolean, Date, Object, Array, Buffer (or `Binary`) and `Set`. The Object type is mapped to a `map`, the Array type is mapped to a `list`. Dates are stored as Unix numeric epoch date stamps. Binary data is supplied via `Buffer` types and is stored as base64 strings in DynamoDB.

The `validate` property defines a regular expression that is used to validate data before writing to the database. Highly recommended.

The `value` property defines a literal string template that is used to compute the attribute value. The `value` is a template string that may contain `${name}` references to other model attributes. This is useful for computing key values from other attributes and for creating compound (composite) sort keys.

### Table Contexts

Each `Table` has a `context` of properties that are blended with `Model` properties. The context is used to provide keys and attributes that apply to more than just one model. A typical use case is for a central authorization module to add an `accountId` or `userId` to the context which is then used in keys for items belonging to that account or user.

When creating items, context properties are written to the database. When updating, context properties are not, only explicit attributes provided in the API `properties` parameter are written.

Context properties take precedence over supplied `properties`. This is to prevent accidental updating of context keys. To force an update, provide the context properties either by updating the context via `Table.setContext` or supplying an explicit context via `params.context`


Use the `Table.setContext` method to initialize the context and `Table.clear` to reset.

### Table Methods


#### addModel(name, fields, migrate)

Add a new model to a table. This invokes the `Model` constructor and then adds the model to the table. The previously defined `Table` indexes are used for the model.


#### async batchGet(batch, params = {})

Invoke a prepared batch operation and return the results. Batches are prepared by creating a bare batch object `{}` and passing that via `params.batch` to the various OneTable APIs to build up a batched operation. Finally invoking `batchGet` or `batchWrite` will execute the accumulated API calls in a batch.

The `batch` parameter should initially be set to `{}` and then be passed to API calls via `params.batch`.

For example:

```javascript
let batch = {}
await Account.get({id: accountId}, {batch})
await User.get({id: userId}, {batch})
let results = await table.batchGet(batch)
```


#### async batchWrite(batch, params = {})

Same as batchGet but for write operations.


#### clear()

Clear the table context properties. The `Table` has a `context` of properties that are blended with `Model` properties before writing items to the database.


#### async create(modelName, properties, params = {})

Create a new item in the database of the given model `modelName` as defined in the table schema.
Wraps the `Model.create` API. See [Model.create](#model-create) for details.


#### async deleteItem(properties, params = {})

Delete an item in the database. This wraps the DynamoDB `deleteItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to remove. Superfluous property fields will be ignored.

The optional params are fully described in [Model API Params](#params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.



#### async getItem(properties, params = {})

Get an item from the database. This API wraps the DynamoDB `getItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to retrieve. Superfluous property fields will be ignored.

The `get` method returns Javascript properties for the item after applying any schema mappings. Hidden attributes will not be returned.

The optional params are fully described in [Model API Params](#params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. By default, the unmodified DynamoDB results are returned.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


#### async find(modelName, properties, params = {})

Find an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.find` API. See [Model.find](#model-find) for details.


#### async get(modelName, properties, params = {})

Get an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.get` API. See [Model.get](#model-get) for details.


#### getModel(name)

Return a model for the given model name.


#### listModels()

Return a list of models defined on the `Table`.


#### async putItem(properties, params = {})

Create an item in the database. This API wraps the DynamoDB `putItem` method.

The `properties` parameter is a Javascript hash containing all the required attributes for the item and must contain the required keys or fields that are used to create the primary key.

OneTable will only write fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the unmodified DynamoDB `put` response. If `params.parse` is set to true, it will return the Javascript properties created for the item with hidden attributes will not be returned.

Before creating the item, all the properties will be validated according to any defined schema validations and all required properties will be checked. Similarly, properties that use a schema enum definition will be checked that their value is a valid enum value. Encrypted fields will be encrypted transparently before writing.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### async queryItems(properties, params)

This API invokes the DynamoDB `query` API and return the results.

The properties should include the relevant key properties.

A key condition may be defined by setting the key property to an object that defines the condition. The condition operator is specified as the key, and the operand as the value. For example:

```javascript
let user = await table.queryItems({pk, sk: {begins: 'user:john'}})
let tickets = await table.queryItems({pk, sk: {between: [1000, 2000]}})
```

The operators include:

```javascript
< <= = >= > <>
begins or begins_with
between
```

Some useful params for queryItems include:

The `params.index` may be set to the desired index name.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### async remove(modelName, properties, params = {})

Delete an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.remove` API. See [Model.remove](#model-remove) for details.


#### removeModel(name)

Remove a model from the `Table` schema.


#### async scanItems(params)

Invokes the DynamoDB `scan` API and return the results.

Some relevant params include:

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### setContext(context = {}, merge = false)

Set the table `context` properties. If `merge` is true, the properties are blended with the existing context.


#### async transact(operation, transaction, params = {})

Invoke a prepared transaction and return the results. Transactions are prepared by creating a bare transaction object `{}` and passing that via `params.transaction` to the various OneTable APIs to build up a transactional operation. Finally invoking `transact` will execute the accumulated API calls within a DynamoDB transaction.

The `operation` parameter should be set to `write` or `get`.

The `transaction` parameter should initially be set to `{}` and then be passed to API calls via `params.transaction`.


#### async update(modelName, properties, params = {})

Create a new item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.update` API. See [Model.update](#model-update) for details.


#### async updateItem(properties, params)

Update an item in the database. This method wraps the DynamoDB `updateItem` API.

The `properties` parameter is a Javascript hash containing properties to update including the required keys or fields that are used to create the primary key.

OneTable will only update fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the unmodified DynamoDB response. If `params.parse` is true, the call returns the Javascript properties for the item with hidden attributes removed.

The optional params are described in [Model API Params](#params).   

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### uuid()

Generate a simple, fast non-cryptographic UUID string.


## Model Class

The `Model` class represents an entity (item) in the database that implements the specified model schema. With one-table design patterns, different model items are store in a single DynamoDB table and are distinguished via their unique primary keys.

Models define attributes in the database which may overlap with the attributes of other models. There is no problem with this.

A model instance is typically created via a model constructor or via the `Table` factory.

### Model Examples

```javascript
import {Table} from 'dynamodb-onetable'

const table = new Table({})

let Account = new Model(table, 'Account', {
    fields: { /* See schema field definitions */},
})
let User = table.getModel('User')

//  Get an item where the name is sufficient to construct the primary key
let account = await Account.get({name: 'Acme Airplanes'})
let user = User.get({email: 'user@example.com'}, {index: 'gs1'})

//  find (query) items
let users = User.find({accountName: 'Acme Airplanes'})

//  Update an item
let user = User.update({email: 'user@example.com', balance: 0}, {index: 'gs1'})
```

### Model Constructor

Models are typically created via the Table `schema` definition and factory. However, you can create them one-by-one as required. After manually creating the model, you should call `Table.addModel` to add to your table.

```javascript
new Model(table, name, options)
```

Where `table` is a configured instance of `Table`. Name is the name of the model and `options` are an optional hash.

The Model `options` are:

| Property | Type | Description |
| -------- | :--: | ----------- |
| fields | `object` | Field attribute definitions. Same format as in the Table `schema` |
| indexes | `object` | Index definition. Same format as in the Table `schema` |
| migrate | `function` | Function to invoke when reading/writing data to assist in migrating items |
| timestamps | `boolean` | Make "created" and "updated" timestamps in items |

### Model High-Level API

<a name="model-create"></a>
#### async create(properties, params = {})

Create an item in the database. This API wraps the DynamoDB `putItem` method.

The `properties` parameter is a Javascript hash containing all the required attributes for the item and must contain the required keys or fields that are used to create the primary key.

OneTable will only write fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the Javascript properties created for the item. Hidden attributes will not be returned.

Before creating the item, all the properties will be validated according to any defined schema validations and all required properties will be checked. Similarly, properties that use a schema enum definition will be checked that their value is a valid enum value. Encrypted fields will be encrypted transparently before writing.

Set params.exists to false to ensure an item of the same key does not already exist. Otherwise, the create will overwrite.

##### Unique Fields

If the schema specifies that an attribute must be unique, OneTable will create a special item in the database to enforce the uniqueness. This item will be an instance of the Unique model with the primary key set to `_unique:Model:Attribute:Value`. The created item and the unique item will be created in a transparent transaction so that the item will be created only if all the unique fields are truly unique.  The `remove` API will similarly remove the special unique item.

The optional params are described in [Model API Params](#params).

<a name="model-find"></a>
#### async find(properties, params = {})

Find items in the database. This API wraps the DynamoDB `query` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` are used to construct a filter expression which is applied by DynamoDB after reading the data but before returning it to the caller. OneTable will utilize fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored in the filter expression.

If `find` is called without a sort key, `find` will utilize the model type as a sort key prefix and return all matching model items. This can be used to fetch all items that match the primary hash key and are of the specified model type.

The `find` method returns an array of items after applying any schema mappings. Hidden attributes in items will not be returned.

#### Pagination

The `find` method will automatically invoke DynamoDB query to fetch additional items and aggregate the result up to the limit specified by `params.limit`. If the limit is exceeded, the last key fetched is set in the 'result.start' property. You can provide this as `params.start` to a subsequent API call to resume the query.

If the limit is exceeded, an `result.next` property is set to a callback function so you can easily invoke the API to retrieve the next page of results. Thanks to Jeremy Daly for this idea. For example:

```javascript
let items = await db.queryItems({...}, {limit: 100})
while (items.length) {
    //  process items
    if (items.next) {
        items = await items.next()
    } else {
        break
    }
}
```


The optional params are fully described in [Model API Params](#params). Some relevant params include:

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

The `params.limit` specifies the maximum number of items to return. The `params.start` defines the start point for the returned items. It is typically set to the last key returned in a previous invocation.

If `params.parse` is set to false, the unmodified DynamoDB response will be returned. Otherwise the results will be parsed and mapped into a set of Javascript properties.

The `params.where` clause may be used to augment the filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

<a name="model-get"></a>
#### async get(properties, params = {})

Get an item from the database. This API wraps the DynamoDB `getItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to retrieve. Superfluous property fields will be ignored.

The `get` method returns Javascript properties for the item after applying any schema mappings. Hidden attributes will not be returned.

The optional params are fully described in [Model API Params](#params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to false, the unmodified DynamoDB response will be returned. Otherwise the results will be parsed and mapped into a set of Javascript properties.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


<a name="model-remove"></a>
#### async remove(properties, params = {})

Remove an item from the database. This wraps the DynamoDB `deleteItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to remove. Superfluous property fields will be ignored.

The optional params are fully described in [Model API Params](#params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


<a name="model-scan"></a>
#### async scan(properties, params = {})

Scan items in the database and return items of the given model type. This wraps the DynamoDB `scan` method. Use `scanItems` to return all model types.

The `properties` parameter is a Javascript hash containing fields used to construct a filter expression which is applied by DynamoDB after reading the data but before returning it to the caller. OneTable will utilize fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored in the filter expression.

The `scan` method returns an array of items after applying any schema mappings. Hidden attributes in items will not be returned.

The optional params are fully described in [Model API Params](#params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to augment the filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


<a name="model-update"></a>
#### async update(properties, params = {})

Update an item in the database. This method wraps the DynamoDB `updateItem` API.

The `properties` parameter is a Javascript hash containing properties to update including the required keys or fields that are used to create the primary key.

OneTable will only update fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the all the Javascript properties for the item. Hidden attributes will not be returned.

The optional params are described in [Model API Params](#params).    

The `params.remove` parameter may be set to a list of attributes to remove.
The `params.add` parameter may be set a value to add to an attribute.
The `params.delete` parameter may be set hash where the hash keys are the attribute sets to modify and the values are the item in the sets to remove.

<a name="params"></a>

#### Model API params

The are the parameter values that may be supplied to various `Model` and `Table` APIs that accept a `params` argument.

| Property | Type | Description |
| -------- | :--: | ----------- |
| add | `object` | Used to atomically add a value to an attribute. Set to an object containing the attribute name and value to add. Example: add: {balance: 1}|
| batch | `object` | Accumulated batched API calls. Invoke with `Table.batch*`|
| capacity | `string` | Set to `INDEXES`, `TOTAL`  or `NONE` to control the capacity metric. Returned in items.capacity|
| consistent | `boolean` | Set to true to stipulate that consistent reads are required.|
| context | `object` | Optional context hash of properties to blend with API properties when creating or updating items. This overrides the Table.context. Setting to `{}` is a useful one-off way to ignore the context for this API. |
| delete | `object` | Used to delete items from a `set` attribute. Set to an object containing the attribute name and item to delete. Example: delete: {colors: 'blue'}|
| execute | `boolean` | Set to true to execute the API. If false, return the formatted command and do not execute. Defaults to true.|
| exists | `boolean` | Set to true for `create`, `delete` or `update` APIs to verify if an item of the same key exists or not. Defaults to false for `create`, null for `delete` and true for `update`.|
| hidden | `boolean` | Hide key attributes in Javascript properties. Overrides model.hidden. Default null. |
| index | `string` | Name of index to utilize. Defaults to 'primary'|
| limit | `number` | Set to the maximum number of items to return from a find / scan.|
| log | `boolean` | Set to true to force the API call to be logged at the 'info' level. Defaults to false.|
| many | `boolean` | Set to true to enable deleting multiple items. Default to false.|
| metrics | `boolean` | Set to true to enable returning performance metrics for find/scan. Defaults to false.|
| parse | `boolean` | Parse DynamoDB response into native Javascript properties. Defaults to true.|
| postFormat | `function` | Hook to invoke on the formatted API command just before execution. Passed the `model` and `args`. Args is an object with properties for the relevant DynamoDB API.|
| preFormat | `function` | Hook to invoke on the model before formatting the DynmamoDB API command. Passed the `model`. Internal API.|
| remove | `array` | Set to a list of of attributes to remove from the item.|
| return | `string` | Set to 'ALL_NEW', 'ALL_OLD', 'NONE', 'UPDATED_OLD' or 'UPDATED_NEW'. The `created` and `updated` APIs will always return the item properties. This parameter controls the `ReturnValues` DynamoDB API parameter.|
| reverse | `boolean` | Set to true to reverse the order of items returned.|
| start | `boolean` | Starting key used with ExclusiveStartKey. Useful to continue find / scan when the specified `limit` is fulfilled.|
| throw | `boolean` | Set to true to throw exceptions when update constraints fail. Defaults to false.|
| transaction | `object` | Accumulated transactional API calls. Invoke with `Table.transaction` |
| type | `string` | Add a `type` condition to the `create`, `delete` or `update` API call. Set `type` to the DynamoDB requried type.|
| updateIndexes | `boolean` | Set to true to update index attributes. The default during updates is not to update index values which are defined during create.|
| where | `string` | Define a filter or update conditional expression template. Use `${attribute}` for attribute names and `{value}` for values. OneTable will extract attributes and values into the relevant ExpressionAttributeNames and ExpressionAttributeValues.|

#### Where Clauses

Using DynamoDB ExpressionAttributeNames and Values is one of the least fun parts of DynamoDB. OneTable makes this much easier via the use of templated `where` clauses.

A `where` clause may be used with `find`, `scan`, `create`, `delete` or `update` APIs to specify a Filter or Conditional update expression. OneTable will parse the `where` clause and extract the names and values to use with the DynamoDB API.

For example:

```javascript
let adminUsers = await User.find({}, {
    where: '(${role} == {admin}) and (${status} == {current})'
})
```

OneTable will extract attributes defined inside `${}` braces and values inside `{}` braces and will automatically define your expression and ExpressionAttributeNames and ExpressionAttributeValues.

##### Where Clause Operators

You can use the following operators with a `where` clause:

```javascript
< <= = >= >
AND OR NOT BETWEEN IN
()
attribute_exists
attribute_not_exists
attribute_type
begins_with
contains
size
```

Where clauses when used with `find` or `scan` can also use the `<>` not equals operator.

See the [AWS Comparison Expression Reference](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html) for more details.

### References

- [DynamoDB Book](https://www.dynamodbbook.com/)
- [Alex DeBrie Best Practices Video](https://www.youtube.com/watch?v=8Ww1YW3AChE)
- [DocumentClient SDK Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)
- [DynamoDB Guide](https://www.dynamodbguide.com/)
- [DynamoDB Toolbox](https://github.com/jeremydaly/dynamodb-toolbox)
- [Best Practices for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Participate

All feedback, contributions and bug reports are very welcome.

* [issues](https://github.com/sensedeep/dynamodb-onetable/issues)

### Contact

You can contact me (Michael O'Brien) on Twitter at: [@SenseDeepCloud](https://twitter.com/SenseDeepCloud), or [email](mob-pub-18@sensedeep.com) and ready my [Blog](https://www.sensedeep.com/blog).

### SenseDeep

Please try our Serverless trouble shooter [SenseDeep](https://www.sensedeep.com/).
