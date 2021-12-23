![OneTable](https://www.sensedeep.com/images/ring-short.png?renew)

*One Table to Rule Them All*

[![Build Status](https://img.shields.io/github/workflow/status/sensedeep/dynamodb-onetable/build)](https://img.shields.io/github/workflow/status/sensedeep/dynamodb-onetable/build)
[![npm](https://img.shields.io/npm/v/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)
[![npm](https://img.shields.io/npm/l/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)
[![Coverage Status](https://coveralls.io/repos/github/sensedeep/dynamodb-onetable/badge.svg?branch=main)](https://coveralls.io/github/sensedeep/dynamodb-onetable?branch=main)

## The Easiest Way to Create DynamoDB Single Table Designs.

OneTable is the most evolved API for DynamoDB. It provides a high-level, elegant dry syntax while still enabling full access to DynamoDB API.

OneTable works with AWS V2 and V3 SDKs for JavaScript and TypeScript. For TypeScript, OneTable will create fully typed entities from your data schemas automatically.

Join the active community using OneTable on our [GitHub Discussion Hub](https://github.com/sensedeep/dynamodb-onetable/discussions) and learn about the growing set of extentions for migrations, CLI and graphical monitoring tools for your single-table designs.

## OneTable Features

* Schema supported one-table access to DynamoDB APIs.
* Efficient storage and access of multiple entities in a single DynamoDB table.
* High level API with type marshaling, validations, and extended query capability for get/delete/update operations.
* Bidirectional conversion of DynamoDB types to Javascript types.
* Generation of Conditional, Filter, Key and Update expressions.
* Schema item definitions for attribute types, default values, enums, unique attributes and validations.
* Option to invoke DynamoDB or simply generate API parameters.
* Powerful field level validations with "required" and "unique" attributes.
* Easy parameterization of filter and conditional queries.
* Detailed metrics by Table, Tenant, Source, Index, Model and Operation.
* Multi-page response aggregation.
* Compound and templated key management.
* Attribute mapping and packing.
* Support for sparse GSIs that project keys and overloaded attributes.
* Encrypted fields.
* CreateTable, DeleteTable table and index admin operations.
* Support for Batch, Transactions, GSI, LSI indexes.
* Intercept hooks to modify DynamoDB requests and responses.
* Controllable logging to see exact parameter, data and responses.
* Simple and easy to read source.
* Integrated statistics.
* Safety options to prevent "rm -fr *".
* No module dependencies.
* Support for the AWS SDK v3.
* TypeScript type inference from schema for full type validation on APIs, parameters, returns, and entities and attributes.
* Migrations support via [OneTable Migrate](https://github.com/sensedeep/onetable-migrate) and [OneTable CLI](https://github.com/sensedeep/onetable-cli).
* Graphical monitoring of single-table performance via [SenseDeep](https://www.sensedeep.com).

## Installation

    npm i dynamodb-onetable

## Quick Tour

Import the OneTable library. If you are not using ES modules or TypeScript, use `require` to import the libraries.

```javascript
import {Table} from 'dynamodb-onetable'
```

If you are using the AWS SDK V2, import the AWS `DynamoDB` class and create a `DocumentClient` instance.

```javascript
import DynamoDB from 'aws-sdk/clients/dynamodb'
const client = new DynamoDB.DocumentClient(params)
```

This version includes prototype support for the AWS SDK V3.

If you are using the AWS SDK V3, import the AWS V3 `DynamoDBClient` class and the OneTable `Dynamo` helper. Then create a `DynamoDBClient` instance and Dynamo wrapper instance. Note: you will need Node v14 or later for this to work.

Note: you can use the Table.setClient API to defer setting the client or replace the client at any time.

```javascript
import Dynamo from 'dynamodb-onetable/Dynamo'
import {Model, Table} from 'dynamodb-onetable'
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
const client = new Dynamo({client: new DynamoDBClient(params)})
```

Initialize your OneTable `Table` instance and define your models via a schema.

```javascript
const table = new Table({
    client: client,
    name: 'MyTable',
    schema: MySchema,
})
```

This will initialize your OneTable Table instance and define your models via a schema.

## Schemas

Schemas define how items will be stored in your database and look like this:

```javascript
const MySchema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1:     { hash: 'gs1pk', sort: 'gs1sk', follow: true },
    },
    models: {
        Account: {
            pk:          { type: String, value: 'account:${name}' },
            sk:          { type: String, value: 'account:' },
            id:          { type: String, uuid: 'ulid', validate: /^[0-9A-F]{32}$/i },
            name:        { type: String, required: true },
            status:      { type: String, default: 'active' },
            zip:         { type: String },
        },
        User: {
            pk:          { type: String, value: 'account:${accountName}' },
            sk:          { type: String, value: 'user:${email}', validate: EmailRegExp },
            id:          { type: String, required: true },
            accountName: { type: String, required: true },
            email:       { type: String, required: true },
            firstName:   { type: String, required: true },
            lastName:    { type: String, required: true },
            username:    { type: String, required: true },
            role:        { type: String, enum: ['user', 'admin'], required: true, default: 'user' },
            balance:     { type: Number, default: 0 },

            gs1pk:       { type: String, value: 'user-email:${email}' },
            gs1sk:       { type: String, value: 'user:' },
        }
    }
}
```

To create an item:

```javascript
let account = await Account.create({
    id: '8e7bbe6a-4afc-4117-9218-67081afc935b',
    name: 'Acme Airplanes',
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
    zip:        '98034',
    created:    1610347305510,
    updated:    1610347305510,
}
```

Get an item:

```javascript
let account = await Account.get({
    id: '8e7bbe6a-4afc-4117-9218-67081afc935b',
})
```

which will return:

```javascript
{
    id:       '8e7bbe6a-4afc-4117-9218-67081afc935b',
    name:     'Acme Airplanes',
    status:   'active',
    zip:      '98034',
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

let users = await User.find({accountId: account.id}, {
    where: '${balance} > {100.00}'
})

//  Get a count of matching users without returning the actual items
let users = await User.find({accountId: account.id, role: 'admin'}, {count: true})
let count = users.count
```

To update an item:

```javascript
await User.update({id: userId, balance: 50})
await User.update({id: userId}, {add: {balance: 10.00}})
await User.update({id: userId}, {set: {status: '{active}'}})
```

To do a transactional update:

```javascript
let transaction = {}
await Account.update({id: account.id, status: 'active'}, {transaction})
await User.update({id: user.id, role: 'user'}, {transaction})
await table.transact('write', transaction)
```

## TypeScript

OneTable provides TypeScript type declaration files so that OneTable APIs, requests and responses can be fully type checked.

OneTable also creates type declarations for your table entities and attributes. TypeScript will catch any invalid entity or entity attribute references.

Using the magic of TypeScript dynamic typing, OneTable automatically converts your OneTable schema into fully typed generic Model APIs.

For example:

```javascript
import {Entity, Model, Table} from 'dynamodb-onetable'

const MySchema = {
    ...
    models: {
        Account: {
            pk:    { type: String, value: 'account:${name}' },
            name:  { type: String },
        }
    } as const     // Required for TypeScript
}

//  Fully typed Account object based on the schema (must include "as const" after the models above)
type AccountType = Entity<typeof MySchema.models.Account>

let account: AccountType = {
    name: 'Coyote',        //  OK
    unknown: 42,           //  Error
}

//  Get an Account access model
let Account = table.getModel<AccountType>('Account')

let account = await Account.update({
    name: 'Acme',               //  OK
    unknown: 42,                //  Error
})

account.name = 'Coyote'         //  OK
account.unknown = 42            //  Error
```

## Why OneTable?

DynamoDB is a great [NoSQL](https://en.wikipedia.org/wiki/NoSQL) database that comes with a learning curve. Folks migrating from SQL often have a hard time adjusting to the NoSQL paradigm and especially to DynamoDB which offers exceptional scalability but with a fairly low-level API.

The standard DynamoDB API requires a lot of boiler-plate syntax and expressions. This is tedious to use and can unfortunately can be error prone at times. I doubt that creating complex attribute type, key, filter, condition and update expressions are anyone's idea of a good time.

Net/Net: it is not easy to write terse, clear, robust Dynamo code for one-table patterns.

Our goal with OneTable for DynamoDB was to keep all the good parts of DynamoDB and to remove the tedium and provide a more natural, "JavaScripty / TypeScripty" way to interact with DynamoDB without obscuring any of the power of DynamoDB itself.

## Working Samples

To get you going quickly, try out the working samples in the OneTable repository at:

* [OneTable Overview Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/overview) &mdash; A quick tour through OneTable.
* [OneTable CRUD Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/crud) &mdash; Basic CRUD.
* [OneTable TypeScript Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/typescript)
* [OneTable Migrate Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/migrate) &mdash; how to use OneTable Migrate.
* [OneTable Packed Attributes Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/packed) &mdash; How to use packed attributes.
* [OneTable SenseDeep Sample](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/sensedeep) &mdash; How to access SenseDeep log data.
* [All OneTable Samples](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples)

## History and Credits

After watching the famous [Rick Houlihan DynamoDB ReInvent Video](https://www.youtube.com/watch?v=6yqfmXiZTlM), we changed how we used DynamoDB for our [SenseDeep](https://www.sensedeep.com) serverless developer studio to use one-table design patterns. However, we found the going tough and thus this library was created to make our one-table patterns less tedious, more natural and a joy with DynamoDB.

A big thank you to [Alex DeBrie](https://www.alexdebrie.com/about/) and his excellent [DynamoDB Book](https://www.dynamodbbook.com/). Highly recommended.

## Database Migrations

To manage your database migrations, consider the
[OneTable CLI](https://www.npmjs.com/package/onetable-cli) which provides command line migration control and the [OneTable Migrate](https://www.npmjs.com/package/onetable-migrate) library for inclusion in your services to manage database migrations.


## Dynamo Class

The Dynamo class is used ease the configuration of the AWS SDK v3. The class is only used with AWS SDK V3 to wrap the DynamoDBClient instance and provide helper methods for OneTable. It does not expose any other methods.

### Dynamo Constructor

The Dynamo constructor takes a parameter of type `object` with the following properties:

| Property | Type | Description |
| -------- | :--: | ----------- |
| client | `DynamoDB` | An AWS SDK v3 [DynamoDBClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-dynamodb/classes/dynamodbclient.html) instance. |
| marshall | `object` | Marshall options for converting to DynamoDB attribute types. See: [util-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_dynamodb.html) for details. |
| unmarshall | `object` | Unmarshall options for converting from DynamoDB attribute types. See: [util-dynamodb](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/modules/_aws_sdk_util_dynamodb.html) for details. |

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

//  Fetch an item collection (will return parsed entities in an item collection)
let items = await table.fetch(['User', 'Product'], {pk: 'account:AcmeCorp'})
let users = items.User
let products = items.Product

//  Alternatively, group after a standard query
let items = await table.queryItems({pk: 'account:AcmeCorp'}, {parse: true, hidden: true})
items = table.groupByType(items)
let users = items.User
let products = items.Product

//  Fetch an account by the ID which is used to create the primary key value
let account = await table.get('Account', {id})

//  Update Account and User in a transaction
let transaction = {}
await table.update('Account', {id: account.id, status: 'active'}, {transaction})
await table.update('User', {id: user.id, role: 'user'}, {transaction})
await table.transact('write', transaction)

//  Fetch an Account using the Account model
let account = await table.find('Account', {id})

//  Get the number of accounts without reading the items
let accounts = await table.scan('Account')
let count = accounts.count
```

### Table Constructor

The Table constructor takes a parameter of type `object` with the following properties:

| Property | Type | Description |
| -------- | :--: | ----------- |
| client | `DocumentClient` | An AWS [DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html) instance. |
| crypto | `object` | Optional properties defining a crypto configuration to encrypt properties. |
| createdField | `string` | Name of the "created" timestamp attribute. Defaults to "created". |
| hidden | `boolean` | Hide templated (value) attributes in Javascript properties. Default true. |
| isoDates | `boolean` | Set to true to store dates as Javascript ISO strings vs epoch numerics. Default false. |
| logger | `boolean|object` | Set to true to log to the console or set to a logging function(type, message, properties). Type is info|error|trace|exception. Default is false. |
| metrics | `object` | Configure metrics. Default null.|
| name | `string` | The name of your DynamoDB table. |
| nulls | `boolean` | Store nulls in database attributes vs remove attributes set to null. Default false. |
| schema | `string` | Definition of your DynamoDB indexes and models. |
| senselogs | `object` | Set to a SenseLogs logger instance instead `logger`. Default null. |
| timestamps | `boolean` | Make "created" and "updated" timestamps in items. Default false. |
| transform | `function` | Callback function to be invoked to format and parse the data before reading and writing. |
| typeField | `string` | Name of the "type" attribute. Default "_type". |
| updatedField | `string` | Name of the "updated" timestamp attribute. Default "updated". |
| uuid | `string` or function | Create a UUID, ULID or custom ID if the schema model requires and the property is not already defined. Set to `uuid` or `ulid` for the internal UUID or ULID implementations. A ULID is a time-based sortable unique ID. Otherwise set to a function for a custom implementation. If not defined, the internal UUID implementation is used by default when required. |
| validate | `function | Function to validate properties before issuing an API.|
| value | `function | Function to evaluate value templates. Default null. |

The `client` property must be an initialized [AWS DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html). The DocumentClient API is currently supported by the AWS v2 API. The recently released AWS v3 API does not yet support the DocumentClient API (stay tuned - See [Issue](https://github.com/sensedeep/dynamodb-onetable/issues/2)).

By default, OneTable will not write `null` values to the database rather, it will remove the corresponding attribute from the item. If you set the `nulls` property to true, `null` values will be written via `create` or `update`. You can also define `nulls` on a model attribute basis via the schema.

The `metrics` property may be set to a map that configures detailed CloudWatch EMF metrics. See Metrics below.

#### Transforming Data

The optional Table `transform` function will be invoked on read and write requests to transform data before reading or writing to the table. The transform function can be used for custom storage formats or to assist with data migrations. The transform function can modify the item as it sees fit and return the modified item. The invocation signature is:

```javascript
item = transform(model, operation, item, properties, params, raw)
```

Where `operation` is set to 'read' or 'write'. The `params` and `properties` are the original params and properties provided to the API call. When writing, the `item` will contain the already transformed properties by the internal transformers. You can overwrite the value in `item` using your own custom transformation logic using property values from `properties`.

When reading, the `item` will contain the already transformed read data and the `raw` parameter will contain the raw data as read from the table before conversion into Javascript properties in `item` via the internal transformers.

You can also use a `params.transform` with many Model APIs. See [Model API Params](#model-api-params) for details.

#### Table Validations

The optional Table `validate` function will be invoked on requests to enable property validation before writing to the table.
The invocation signature is:

```javascript
details = validate(model, properties, params)
```

The validation function must return a map of validation messages for properties that fail validation checks. The map is indexed by the property field name.

#### Value Template Function

Value templates are defined in the schema for model fields. These are typically literal strings with property variable references. In some use cases, more complex logic for a value template requires a function to calculate the property value at runtime. The Table params.value function provides a centralized place to evaluate value templates. It will be invoked for fields that define their value template to be `true`.

The value template function is called with the signature:

```javascript
str = value(model, fieldName, properties, params)
```

The value template should return a string to be used for the given fieldName.


#### Crypto

The `crypto` property defines the configuration used to encrypt and decrypt attributes that specify `encrypt: true` in their schema. This is useful as an additional layer of security for passwords, keys and other especially sensitive information. The crypto property should be set to a hash that contains the `cipher` to use and an encryption secret/password.

```javascript
{
    "cipher": "aes-256-gcm",
    "password": "16719023-772f-133d-1111-aaaa7722188f"
}
```

#### Logger

OneTable can log complete request parameters and responses to assist you in debugging and understanding how your API requests are being translated to DynamoDB.

You can set `logger` parameter to `true` for simple logging to the console. Alternatively, the `logger` may be set to logging callback that will be invoked as required to log data. The logger function has the signature:

```javascript
const table = new Table({
    ...
    logger: (level, message, context) => {
        if (level == 'trace' || level == 'data') return
        console.log(`${new Date().toLocaleString()}: ${level}: ${message}`)
        console.log(JSON.stringify(context, null, 4) + '\n')
    }
})
```

Where `level` is set to `info`, `error`, `warn`, `exception`, `trace` or `data`. The `trace` level is for verbose debugging messages. The `data` level logs user data retrieved find and get API calls.

The `message` is a simple String containing a descriptive message. The `context` is a hash of contextual properties regarding the request, response or error.

If you use {log: true} in the various OneTable Model API options, the more verbose `trace` and `data` levels will be changed to `info` for that call before passing to the logging callback. In this way you can emit `trace` and `data` output on a per API basis.

#### SenseLogs

OneTable also integrates with [SenseLogs](https://www.npmjs.com/package/senselogs) which is a simple, dynamic logger designed for serverless.

```javascript
import SenseLogs from 'senselogs'
const senselogs = new SenseLogs()
const table = new Table({senselogs})
```

This will log request details in JSON. Use `SenseLogs({destination: 'console'})` for plain text logging to the console.


#### Metrics

OneTable can emit detailed CloudWatch custom metrics to track DynamoDB performance and usage on a per app/function, index, entity model and operation basis.  

The metrics are emitted using the CloudWatch EMF format with dimensions for: Table, Source, Index, Model and Operation.

The following metrics are emitted for each dimension combination:

* read — Read capacity units consumed
* write — Write capacity units consumed
* latency — Aggregated request latency in milliseconds
* count — Count of items returned
* scanned — Number of items scanned
* requests — Number of API requests issued

SenseDeep and other tools can present and analyze these metrics to gain insights and graph into how your single-table designs are performing.

The properties of Table constructor `params.metrics` property are:

| Property | Type | Description |
| -------- | :--: | ----------- |
| chan | `string` | Log channel to use to emit metrics. Defaults to 'metrics'.|
| dimensions | `array` | Ordered array of dimensions to emit. Defaults to [Table, Tenant, Source, Index, Model, Operation].|
| enable | `boolean` | Set to true to enable metrics. Defaults to true.|
| env | `boolean` | Set to true to enable dynamic control via the LOG_FILTER environment variable. Defaults to true.|
| max | `number` | Number of DynamoDB API calls for which to buffer metrics before flushing. Defaults to 100.|
| namespace | `string` | CloudWatch metrics namespace for the metrics. Defaults to `SingleTable/metrics`.|
| period | `number` | Number of seconds to buffer metrics before flushing. Defaults to 30 seconds.|
| properties | `map|function` | Set to a map of additional properties to be included in EMF log record. These are not metrics. Set to a function that will be invoked as `properties(operation, params, result)` and should return a map of properties. Defaults to null.|
| queries | `boolean` | Set to true to enable per-query profile metrics. Defaults to true.|
| source | `string` | Name of application or function name that is calling DynamoDB. Default to the Lambda function name.|
| tenant | `string` | Set to an identifying string for the customer or tenant. Defaults to null.|

Metrics can be dynamically controlled by the LOG_FILTER environment variable. If this environment variable contains the string `dbmetrics` and the `env` params is set to true, then Metrics will be enabled. If the `env` parameter is unset, LOG_FILTER will be ignored.

```javascript
const table = new Table({
    metrics: {source: 'acme:launcher', env: true}
})
```

You can also generate metrics for specially profiled queries and scans via the `params.profile` tag. The profile param takes a unique string tag and metrics will be created for the dimensions [Profile, profile-tag-name]. These metrics exist outside the ordered list specified via the Metrics `dimensions` parameter.

```javascript
await User.find({}, {profile: 'find-all-users'})
```

Read more about how to use and configure metrics at [Understanding Your DynamoDB Performance](https://www.sensedeep.com/blog/posts/stories/single-table-dynamodb-monitoring.html).

The metrics can be viewed in CloudWatch or best via the free [SenseDeep Developer](https://www.sensedeep.com) plan which has detailed graphs for your single-table monitoring for DynamoDB.

![Single Table Monitoring](https://www.sensedeep.com/images/sensedeep/table-single.png).

#### Metrics Under the Hood

The metric are emitted using [CloudWatch EMF](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html) via the `metrics` method. This permits zero-latency creation of metrics without impacting the performance of your Lambdas.

Metrics will only be emitted for dimension combinations that are active. If you have many application entities and indexes, you may end up with a large number of metrics. If your site uses all these dimensions actively, your CloudWatch Metric costs may be high. You will be charged by AWS CloudWatch for the total number of metrics that are active each hour at the rate of $0.30 cents per hour.

If your CloudWatch costs are too high, you can minimize your charges by reducing the number of dimensions via the `dimensions` property. You could consider disabling the `source` or `operation` dimensions. Alternatively, you should consider [SenseLogs](https://www.npmjs.com/package/senselogs) which integrates with OneTable and can dynamically control your metrics to enable and disable metrics dynamically.

DynamoDB Metrics are buffered and aggregated to minimize the load on your system. If a Lambda function is reclaimed by AWS Lambda, there may be a few metric requests that are not emitted before the function is reclaimed. This should be a very small percentage and should not significantly impact the quality of the metrics. You can control this buffering via the `max` and `period` parameters.

#### Schema

The `schema` property describes the indexes and models (entities) on your DynamoDB table. Models may be defined via the `schema` or alternatively may be constructed using the `Model` constructor and the `Table.addModel` method.

The valid properties of the `schema` object are:

| Property | Type | Description |
| -------- | :--: | ----------- |
| format | `string` | Reserved. Set to 'onetable:1.0.0' |
| indexes | `object` | Hash of indexes used by the table. |
| models | `object` | Hash of model entities describing the model keys, indexes and attributes. |
| params | `object` | Hash of model entities describing the model keys, indexes and attributes. |
| version | `string` | A Semver compatible version string. |

#### Indexes

The `schema.indexes` property can contain one or more indexes and must contain the `primary` key. Additional indexes will be treated as Local Secondary Indexes (LSIs) if they only contain as `sort` key or if they set the hash key to the same value the primary index hash key. They will be treated as Global Secondary Indexes (GSIs) if they provide a unique hash key value.

```javascript
{
    primary: {
        hash: 'pk',         //  Schema property name of the hash key
        sort: 'sk',         //  Schema property name of the sort key
    },
    //  Zero or more global secondary or local secondary indexes
    gs1: {
        hash: 'gs1pk',      //  Omit the hash for an LSI or set to the primary index hash name
        sort: 'gs1sk',
        project: 'all',
        follow: true,
    },
    ...
}
```

Note the hash and sort names are schema property names which may differ from table attribute names if you are using mapping.

The `project` property can be set to 'all' to project all attributes to the secondary index, set to 'keys' to project only keys and may be set to an array of attributes (not properties) to specify an explicit list of attributes to project. The `project` property is used by the Table.createTable and updateTable APIs only.

The `follow` property is used to support GSI indexes that project KEYS_ONLY or only a subset of an items properties. When `follow` is true, any fetch of an item via the GSI will be transparently followed by a fetch of the full item using the primary index and the GSI projected keys. This incurs an additional request for each item, but for large data sets, it is useful to minimize the size of a GSI and yet retain access to full items.

#### Models

The `schema.models` property contains one or more models with attribute field descriptions. The models collections define the attribute names, types, mappings, validations and other properties. For example:

```javascript
{
    album: {
        pk:     { type: String, value: '${_type}:${name}' },
        sk:     { type: String, value: '${_type}:' },
        name:   { type: String, required: true },
        songs:  { type: Number },
    },
    artist: {
        pk:     { type: String, value: '${_type}:${name}' },
        sk:     { type: String, value: '${_type}:' },
        name:   { type: String, required: true },
        address: {
            type: Object, schema: {
                street: { type: String },
                city: { type: String },
                zip: { type: String },
            },
        },
    }
}
```

The name of the entity model is model map name (album and artist above).

The valid types are: Array, Binary, Boolean, Buffer, Date, Number, Object, Set and String.

OneTable will ensure that values are of the correct type before writing to the database. Where possible, values will be cast to their correct types. For example: 'false' will be cast to false for Boolean types and 1000 will be cast to '1000' for String types.

These JavaScript types map onto the equivalent DynamoDB types. For Binary types, you can supply data values with the types: ArrayBuffer and Buffer.

For Sets, you should set the schema type to Set and supply values as instances of the JavaScript Set type. DynamoDB supports sets with elements that are strings, numbers or binary data.

OneTable will automatically add a `_type` attribute to each model that is set to the name of the model. However, you can explicitly define your type attribute in your model schema if you wish.

The type field can be used in PK/SK value templates by using `${_type}`. You can change the name of the type field from `_type` by setting the `params.typeField` in the Table constructor.

##### Schema Attribute Properties

The following attribute properties are supported:

| Property | Type | Description |
| -------- | :--: | ----------- |
| crypt | `boolean` | Set to true to encrypt the data before writing. |
| default | `string` | Default value to use when creating model items or when reading items without a value.|
| enum | `array` | List of valid string values for the attribute. |
| filter | `boolean` | Enable a field to be used in a filter expression. Default true. |
| hidden | `boolean` | Set to true to omit the attribute in the returned Javascript results. Attributes with a "value" template defined will by hidden by default. Default to false. |
| map | `string` | Map the field value to a different attribute name when storing in the database. Can be a simple attribute name or a compound "obj.name" where multiple fields can be stored in a single attribute containing an object with all the fields. |
| nulls | `boolean` | Set to true to store null values or false to remove attributes set to null. Default false. |
| required | `boolean` | Set to true if the attribute is required. Default false. |
| reference | `string` | Describes a reference to another entity item. Format is: model:index:attribute=src-attribute,... |
| schema | `object` | Nested schema. |
| type | `Type or string` | Type to use for the attribute. |
| unique | `boolean` | Set to true to enforce uniqueness for this attribute. Default false. |
| uuid | `boolean` or `string` | Set to true to automatically create a new UUID value for the attribute when creating new items. This uses the default Table UUID setting if set to true. Set to 'uuid' or 'ulid' to select the internal UUID or ULID implementations. Default false. |
| validate | `RegExp` | Regular expression to use to validate data before writing. |
| value | `string` | Template to derive the value of the attribute. These attributes are "hidden" by default. |


If the `default` property defines the default value for an attribute. If no value is provided for the attribute when creating a new item, the `default` value will be used.

If the `hidden` property is set to true, the attribute will be defined in the DynamoDB database table, but will be omitted in the returned Javascript results.

The `map` property can be used to set an alternate or shorter attribute name when storing in the database. The map value may be a simple string that will be used as the actual attribute name.

Alternatively, the map value can be a pair of the form: 'obj.name', where the attribute value will be stored in an object attribute named "obj" with the given name `name`. Such two-level mappings may be used to map multiple properties to a single table attribute. This is helpful for the design pattern where GSIs project keys plus a single 'data' field and have multiple models map relevant attributes into the projected 'data' attribute. OneTable will automatically pack and unpack attribute values into the mapped attribute. Note: APIs that write to a mapped attribute must provide all the properties that map to that attribute on the API call. Otherwise an incomplete attribute would be written to the table.

The `reference` attribute documents a reference to another entity by using this attribute in combination with other attributes. The format is:

```bash
model:index:attribute=source-attribute,...
```

The "model" selects that target entity model of the reference using the nominated "index" where the target "attribute" is determined by the associated source-attribute. Multiple attributes can be specified. Tools can use this reference to navigate from one entity item to another.

The `schema` property permits nested field definitions. The parent property must be an Object as Arrays are not yet supported. Note: TypeScript typings are not created for nested schemas.

The `type` properties defines the attribute data type. Valid types include: String, Number, Boolean, Date, Object, Null, Array, Buffer (or Binary) and Set. The object type is mapped to a `map`, the array type is mapped to a `list`. Dates are stored as Unix numeric epoch date stamps unless the `isoDates` parameter is true, in which case the dates are store as ISO date strings. Binary data is supplied via `buffer` types and is stored as base64 strings in DynamoDB.

The `validate` property defines a regular expression that is used to validate data before writing to the database. Highly recommended.

The `value` property defines a literal string template that is used to compute the attribute value. This is useful for computing key values from other properties, creating compound (composite) sort keys or for packing fields into a single DynamoDB attribute when using GSIs.

String templates are similar to JavaScript string templates. The template string may contain `${name}` references to other fields defined in the entity model. If any of the variable references are undefined when an API is called, the computed field value will be undefined and the attribute will be omitted from the operation. The variable `name` may be of the form: `${name:size:pad}` where the name will be padded to the specified size using the given `pad` character (which default to '0'). This is useful for zero padding numbers so that they sort numerically.

If you call `find` or any query API and do not provide all the properties needed to resolve the complete value template. i.e. some of the ${var} references are unresolved, OneTable will take the resolved leading portion and create a `begins with` key condition for that portion of the value template.

### Table Contexts

Each `Table` has a `context` of properties that are blended with `Model` properties before executing APIs. The context is used to provide keys and attributes that apply to more than just one API invocation. A typical use case is for a central authorization module to add an `accountId` or `userId` to the context which is then used in keys for items belonging to that account or user. This is useful for multi-tenant applications.

When creating items, context properties are written to the database. When updating, context properties are not, only explicit attributes provided in the API `properties` parameter are written.

Context properties take precedence over supplied `properties`. This is to prevent accidental updating of context keys. To force an update of context attributes, provide the context properties either by updating the context via `Table.addContext`, replacing the context via `Table.setContext` or supplying an explicit context via `params.context` to the individual API.

Use the `Table.setContext` method to initialize the context and `Table.clear` to reset.


### Table Methods

The Table API provides a utility methods and low-level data API to manage DynamoDB. The low-level methods are: deleteItem, getItem, putItem, updateItem. Use these methods to do raw I/O on your table. In general, you should prefer the Model APIs that are based on their schema definition and provide a higher level of operation. The model methods are: create, get, find, remove and update.

#### addContext(context = {})

Add the table `context` properties. The context properties are merged with (overwrite) the existing context.

#### addModel(name, fields)

Add a new model to a table. This invokes the `Model` constructor and then adds the model to the table. The previously defined `Table` indexes are used for the model.


#### async batchGet(operation, params = {})

Invoke a prepared batch operation and return the results. Batches are prepared by creating a bare batch object `{}` and passing that via `params.batch` to the various OneTable APIs to build up a batched operation. Invoking `batch` will execute the accumulated API calls in a batch.

The `batch` parameter should initially be set to `{}` and then be passed to API calls via `params.batch`.

For example:

```javascript
let batch = {}
await Account.get({id: accountId}, {batch})
await User.get({id: userId}, {batch})
let results = await table.batchGet(batch)
```

Set batch params.consistent for a consistent read.

If using params.fields to return a field set, you must provide actual attribute names in the field list and not mapped property names like when using normal Model params.fields.

#### async batchWrite(batch, params = {})

Same as batchGet but for write operations.

#### clearContext()

Clear the table context properties. The `Table` has a `context` of properties that are blended with `Model` properties before writing items to the database.


#### async create(modelName, properties, params = {})

Create a new item in the database of the given model `modelName` as defined in the table schema.
Wraps the `Model.create` API. See [Model.create](#model-create) for details.


#### async createTable(params)

Create a DynamoDB table based upon the needs of the specified OneTable schema. The table configuration can be augmented by supplying additional createTable configuration via the `params.provisioned`. See [DynamoDB CreateTable](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html#createTable-property) for details.


#### async deleteItem(properties, params = {})

Delete an item in the database. This wraps the DynamoDB `deleteItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to remove. Superfluous property fields will be ignored.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression. The properties must include the key attributes if you wish to use `params.prev` for reverse pagination.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


#### async deleteTable(confirmation)

Delete a DynamoDB table. Because this is a destructive operation, a confirmation string of 'DeleteTableForever' must be provided.


#### async exists()

Test if the table name exists in the database.


#### async fetch(models, properties, params = {})

Fetch an item collection of items that share the same primary key. Models should be a list of model type names to return. The properties should provide the primary key shared by those model types. The return result is a map with items organized by their model type.

For example:

```javascript
let items = await table.fetch(['User', 'Product'], {pk: 'account:AcmeCorp'})
let users = items.User
let products = items.Product
users.forEach(user => /* operate on user */)
products.forEach(product => /* operate on product */)
```

#### async find(modelName, properties, params = {})

Find an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.find` API. See [Model.find](#model-find) for details.


#### async get(modelName, properties, params = {})

Get an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.get` API. See [Model.get](#model-get) for details.


#### getContext()

Return the current context properties.


#### getCurrentSchema(): OneSchema

Return the schema currently used by the table.


#### getLog()

Return the current logger object.


#### async getKeys()

Return the current primary table and global secondary index keys. Returns a map indexed by index name or 'primary'. The partition key property is named 'hash' and the sort key 'sort'.


#### async getItem(properties, params = {})

Get an item from the database. This API wraps the DynamoDB `getItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to retrieve. Superfluous property fields will be ignored.

The `get` method returns Javascript properties for the item after applying any schema mappings. Hidden attributes will not be returned.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. By default, the unmodified DynamoDB results are returned.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


#### getModel(name)

Return a model for the given model name.


#### groupByType(items)

Return the items grouped by the configured table typeField property. Returns a map indexed by type name.

#### listModels()

Return a list of models defined on the `Table`.


#### async listTables()

Return a list of tables in the database.


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

The sort key may be defined as a key condition by setting the property to an object that defines the condition. The condition operator is specified as the key, and the operand as the value.

These operators may only be used with the sort key property. If the sort key uses a value template, you cannot use the operator on the sort key value directly and not on the properties that are referenced in the value template.

For example:

```javascript
let user = await table.queryItems({pk, sk: {begins: 'user:john'}})
let tickets = await table.queryItems({pk, sk: {between: [1000, 2000]}})
let invoices = await table.queryItems({pk, sk: {'<=': 1000}})
```

The operators include:

```javascript
< <= = <> >= >
begins or begins_with
between
```

For TypeScript, the OneTable creates strict typings on properties and so special steps are required for {beings}, {between} etc. For TypeScript, OneTable supports tunneling such values via the params. Alternatively, use the `Where Clause` formulation described below. For example:

```typescript
let user = await table.queryItems({pk}, {tunnel: {begins: {sk: 'user:john'}}})
let tickets = await table.queryItems({pk}, {tunnel: {between: {sk: [1000, 2000]}}})
let invoices = await table.queryItems({pk}, {tunnel: {'<=': {sk: 1000}}})
```

**Filter Expressions**

Non-key fields are used to construct a filter expression which is applied by DynamoDB after reading the data but before returning it to the caller. OneTable will utilize fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored in the filter expression.

More complex filter expressions may be created via a `params.where` property. For example:

```javascript
let invoices = await table.queryItems({pk}, {where: '${sk} <= {1000}'})
```

See [Where Clause](#where-clauses) for more details.

If `queryItems` is called without a sort key, `queryItems` will utilize the model type as a sort key prefix and return all matching model items. This can be used to fetch all items that match the primary hash key and are of the specified model type.

The `queryItems` method returns an array of items after applying any schema mappings. Hidden attributes in items will not be returned.


Some useful params for queryItems include:

The `params.index` may be set to the desired index name.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### async readSchema(): OneSchema

Read the `Current` schema from the table if it has been stored there via `saveSchema`.


#### async readSchemas(): OneSchema[]

Read all stored schemas from the table.


#### async remove(modelName, properties, params = {})

Delete an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.remove` API. See [Model.remove](#model-remove) for details.


#### removeModel(name)

Remove a model from the current schema in use by the table. This does not impact the persisted schemas.


#### removeSchema(schema)

Remove a schema from the persisted `Table` schema items. The schema should include a `name` property that describes the schema.


#### async saveSchema(schema?: OneSchema): OneSchema

Save the current schema to the table using the _Schema:_Schema hash/sort key pair.

If the schema parameter is null or not provided, the currently configured schema will be saved.
If a schema is provided and the schema.params is unset, the saved schema will include the current Table parms.

#### async scanItems(params)

Invokes the DynamoDB `scan` API and return the results.

Some relevant params include:

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.

The scan method supports parallel scan where you invoke scan simultaneously from multiple workers. Using the async/await pattern, you can start the workers and then use a Promise.all to wait for their completion.
To perform parallel scans, you should set the `params.segments` to the number of parallel segements and the `params.segment` to the numeric segment to be scaned for that worker.

```javacript
const segments = 4
let promises = []
for (let segment = 0; segment < segments; segment++) {
    promises.push(table.scanItems({}, {segment, segments}))
}
let results = await Promise.all(promises)
```

#### setClient(client)

Assign an AWS SDK V2 DocumentClient or AWS SDK V3 Dynamo helper client to be used for communiction with DynamoDB. Note the V3 DocumentClient instance is a native AWS SDK DocumentClient instance. For AWS SDK V3, the client is an instance of the OneTable Dynamo helper.

#### setContext(context = {}, merge = false)

Set the table `context` properties. If `merge` is true, the properties are blended with the existing context.

#### async setSchema(schema?: OneSchema)

Set the current schema for the table instance. This will reset the current schema. If the schema parameter contains a schema.params, these will be applied and overwrite the current Table params.

If the schema property is null, the current schema will be removed.

If the current table params contained function callbacks for `uuid`, `transform` or `metrics.properties` these will be retained when the new schema is applied.

Note: This will not persist the schema to the table (Use `saveSchema` for that).


#### async transact(operation, transaction, params = {})

Invoke a prepared transaction and return the results. Transactions are prepared by creating a bare transaction object `{}` and passing that via `params.transaction` to the various OneTable APIs to build up a transactional operation. Finally invoking `transact` will execute the accumulated API calls within a DynamoDB transaction.

The `operation` parameter should be set to `write` or `get`.

The `transaction` parameter should initially be set to `{}` and then be passed to API calls via `params.transaction`.

A `get` operation will return an array containing the items retrieved.

The `Table.groupBy` can be used to organize the returned items by model. E.g.

```javascript
let transaction = {}
await table.get('Account', {id: accountId}, {transaction})
await table.get('User', {id: userId}, {transaction})
let items = await table.transact('get', transaction, {parse: true, hidden: true})
items = table.groupByType(items)
let accounts = items.Account
let users = items.User
```

#### async update(modelName, properties, params = {})

Update an item in the database of the given model `modelName` as defined in the table schema. Wraps the `Model.update` API. See [Model.update](#model-update) for details.


#### async updateItem(properties, params)

Update an item in the database. This method wraps the DynamoDB `updateItem` API.

The `properties` parameter is a Javascript hash containing properties to update including the required keys or fields that are used to create the primary key.

OneTable will only update fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the unmodified DynamoDB response. If `params.parse` is true, the call returns the Javascript properties for the item with hidden attributes removed.

The optional params are described in [Model API Params](#model-api-params).   

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to true, the results will be parsed and mapped into a set of Javascript properties. Otherwise, the unmodified DynamoDB response will be returned.


#### async updateTable(params)

Update a table and create or remove a Global Secondary Index.  

Set `params.create` to an index to create. Set `create` to a map with properties for the `hash` and `sort` attributes. E.g.

```javascript
await table.updateTable({create: {
    hash: 'gs1pk',
    hash: 'gs2pk',
    name: 'gs1',
}})
```
Set `params.remove` to remove an index. Set `remove` to a map with a `name` property of the table to remove. E.g.

```javascript
await table.updateTable({remove: {
    name: 'gs1'
}})
```

#### uuid()

Generate a simple, fast non-cryptographic UUID string.


#### ulid()

Generate a [ULID](https://github.com/ulid/spec). Useful when you need a time-based sortable, cryptographic, unique sequential number.


## Model Class

The `Model` class represents an entity (item) in the database that implements the specified model schema. With one-table design patterns, different model items are store in a single DynamoDB table and are distinguished via their unique primary keys.

Models define attributes in the database which may overlap with the attributes of other models. There is no problem with this.

A model instance is typically created via a model constructor or via the `Table` factory.

Errors will thow an instance of the `OneError` error class. See [Error Handling](#error-handling) for more details.

### Model Examples

```javascript
import {Table} from 'dynamodb-onetable'

const table = new Table({})

let Account = table.getModel('Account')
let User = table.getModel('User')

//  Get an item where the name is sufficient to construct the primary key
let account = await Account.get({name: 'Acme Airplanes'})
let user = await User.get({email: 'user@example.com'}, {index: 'gs1'})

//  find (query) items
let users = await User.find({accountName: 'Acme Airplanes'})

//  Update an item
let user = await User.update({email: 'user@example.com', balance: 0})
```


### Model Constructor

Models are typically created via the Table `schema` definition and factory and retrieved using the Table.getModel(name) method.

```javascript
let User = table.getModel('User')
```

or in TypeScript to return a fully typed model:

```typescript
type UserType = Entity<typeof Schema.models.User>
let User = table.getModel<UserType>('User')
```

Thereafter, the references to User instances will be fully type checked. Note: you must add "as const" to the end of your models after the closing brace.

Where `table` is a configured instance of `Table`. Name is the name of the model and `options` are an optional hash.

The Model `options` are:

| Property | Type | Description |
| -------- | :--: | ----------- |
| fields | `object` | Field attribute definitions. Same format as in the Table `schema` |
| indexes | `object` | Index definition. Same format as in the Table `schema` |
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

For create, the params.exists will default to a false value to ensure an item of the same key does not already exist. If set to null, a create will be allowed to overwrite an existing item.

##### Unique Fields

If the schema specifies that an attribute must be unique, OneTable will create a special item in the database to enforce the uniqueness. This item will be an instance of the Unique model with the primary key set to `_unique:Model:Attribute:Value`. The created item and the unique item will be created in a transparent transaction so that the item will be created only if all the unique fields are truly unique.  The `remove` API will similarly remove the special unique item.

The optional params are described in [Model API Params](#model-api-params).

<a name="model-find"></a>
#### async find(properties, params = {})

Find items in the database. This API wraps the DynamoDB `query` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

The sort key may be defined as a simple value or as a key condition by setting the property to an object that defines the condition. The condition operator is specified as the key, and the operand as the value. For example:

```javascript
let user = await User.find({pk, sk: {begins: 'user:john'}})
let tickets = await Ticket.find({pk, sk: {between: [1000, 2000]}})
let invoices = await Invoice.find({pk, sk: {'<=': 1000}})
let invoices = await Invoice.find({pk}, {where: '${sk} <= {1000}'})

let items = await Invoice.find({pk}, {where: '${sk} <= {1000}'}, {count: true})
let count = items.count
```

The operators include:

```javascript
< <= = >= >
begins or begins_with
between
```

Additional fields supplied in `properties` are used to construct a filter expression which is applied by DynamoDB after reading the data but before returning it to the caller. OneTable will utilize fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored in the filter expression.

More complex filter expressions may be created via a `params.where` property. For example:

```javascript
let adminUsers = await User.find({}, {
    where: '(${role} = {admin}) and (${status} = {current})'
})
```

Use `params.count` set to true to return the number of matching items instead of returning the items.

See [Where Clause](#where-clauses) for more details.

If `find` is called without a sort key, `find` will utilize the model type as a sort key prefix and return all matching model items. This can be used to fetch all items that match the primary hash key and are of the specified model type.

The `find` method returns an array of items after applying any schema mappings. Hidden attributes in items will not be returned.


#### Pagination

The `find` method will automatically invoke DynamoDB query to fetch additional items and aggregate the result up to the limit specified by `params.limit`. If the limit is exceeded, the last key fetched is set in the 'result.next' property of the returned array of items. You can provide this as `params.next` to a subsequent API call to continue the query with the next page of results.


```typescript
let next
do {
    let items = await User.find({accountId}, {limit: 10, next})
    //  process items
    next = items.next
} while (next)
```

To scan backwards, set Params.reverse to true.

The keys for the first item are returned in `params.prev` which can be used to retrieve the previous page.

```typescript
let firstPage = await User.find({accountId}, {limit})
let secondPage = await User.find({accountId}, {limit, next: secondPage.next})
let previousPage = await User.find({accountId}, {limit, prev: items.prev})
```

Note: the limit is the number of items read by DynamoDB before filtering and thus may not be equal to the number of items returned if you are using filtering expressions.

To control the number of pages that queryItems will request, set the `params.maxPages` to the desired number.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If the `params.follow` is set to true, each item will be re-fetched using the returned results. This is useful for KEYS_ONLY secondary indexes where OneTable will use the retrieved keys to fetch all the attributes of the entire item using the primary index. This incurs an additional request for each item, but for large data sets, it enables the transparent use of a KEYS_ONLY secondary index which may greatly reduce the size (and cost) of the secondary index.

The `params.limit` specifies the maximum number of items for DynamoDB to read. The `params.next` defines the start point for the returned items. It is typically set to the last key returned from previous invocation via the `result.next` property. Note: the limit is the number of items DynamoDB reads before filtering.

The `params.maxPages` specifies the maximum number of DynamoDB query requests that OneTable will perform for a single API request.

If `params.parse` is set to false, the unmodified DynamoDB response will be returned. Otherwise the results will be parsed and mapped into a set of Javascript properties.

If `params.next` or `params.prev` is set to a map that contains the primary hash and sort key values for an existing item, the query will commence at that item. The `params.next` will be the exclusive start of the query, whereas `params.prev` will define the end of the query. These two properties are mutually exclusive, both of them can't be set at the same time.

The `params.where` clause may be used to augment the filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.


<a name="model-get"></a>
#### async get(properties, params = {})

Get an item from the database. This API wraps the DynamoDB `getItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to retrieve. Superfluous property fields will be ignored.

The `get` method returns Javascript properties for the item after applying any schema mappings. Hidden attributes will not be returned.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If the `params.follow` is set to true, the item will be re-fetched using the retrieved keys for the item. This is useful for KEYS_ONLY secondary indexes where OneTable will use the retrieved keys to fetch all the attributes of the item using the primary index. This incurs an additional request, but for very large data sets, it enables the transparent use of a KEYS_ONLY secondary index which reduces the size of the database.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.parse` is set to false, the unmodified DynamoDB response will be returned. Otherwise the results will be parsed and mapped into a set of Javascript properties.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

<a name="model-init"></a>
#### async init(properties, params = {})

Return a constructed model item without writing to the database. This will return an object with all the model properties set to null including default properties, UUID properties and value template properties. Be careful using these objects with create() as you should define values for all attributes.

<a name="model-remove"></a>
#### async remove(properties, params = {})

Remove an item from the database. This wraps the DynamoDB `deleteItem` method.

The `properties` parameter is a Javascript hash containing the required keys or fields that are used to create the primary key.

Additional fields supplied in `properties` may be used to construct a filter expression. In this case, a `find` query is first executed to identify the item to remove. Superfluous property fields will be ignored.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to define a filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

This API does not return a result. To test if the item was actually removed, set `params.exists` to true and the API will throw an exception if the item does not exist.


<a name="model-scan"></a>
#### async scan(properties, params = {})

Scan items in the database and return items of the given model type. This wraps the DynamoDB `scan` method and uses a filter expression to extract the designated model type. Use `scanItems` to return all model types. NOTE: this will still scan the entire database.

An alternative to using scan to retrieve all items of a give model type is to create a GSI and index the model `type` field and then use `query` to retrieve the items. This index can be a sparse index if only a subset of models are indexed.

The `properties` parameter is a Javascript hash containing fields used to construct a filter expression which is applied by DynamoDB after reading the data but before returning it to the caller. OneTable will utilize fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored in the filter expression.

The `scan` method returns an array of items after applying any schema mappings. Hidden attributes in items will not be returned.

The optional params are fully described in [Model API Params](#model-api-params). Some relevant params include:

The `params.fields` may be set to a list of properties to return. This defines the ProjectionExpression.

If `params.execute` is set to false, the command will not be executed and the prepared DynamoDB API parameters will be returned.

If `params.many` is set to true, the API may be used to delete more than one item. Otherwise, for safety, it is assume the API will only remove one item.

The `params.where` clause may be used to augment the filter expression. This will define a FilterExpression and the ExpressionAttributeNames and ExpressionAttributeValues. See [Where Clause](#where-clauses) for more details.

The scan method supports parallel scan where you invoke scan simultaneously from multiple workers. Using the async/await pattern, you can start the workers and then use a Promise.all to wait for their completion.
To perform parallel scans, you should set the `params.segments` to the number of parallel segements and the `params.segment` to the numeric segment to be scaned for that worker.

```javacript
const segments = 4
let promises = []
for (let segment = 0; segment < segments; segment++) {
    promises.push(table.scan({}, {segment, segments}))
}
let results = await Promise.all(promises)
```

<a name="model-template"></a>
#### async template(fieldName, properties)

Return the evaluated field value template based on the given properties. This is a utility routine to manually evaluate value templates.

<a name="model-update"></a>
#### async update(properties, params = {})

Update an item in the database. This method wraps the DynamoDB `updateItem` API.

The `properties` parameter is a Javascript hash containing properties to update including the required keys or fields that are used to create the primary key.

OneTable will only update fields in `properties` that correspond to the schema attributes for the model. Superfluous property fields will be ignored.

The property names are those described by the schema. NOTE: these are not the same as the attribute names stored in the Database. If a schema uses `map` to define a mapped attribute name, the Javascript field name and the DynamoDB attribute name may be different.

The method returns the all the Javascript properties for the item. Hidden attributes will not be returned.

If the method fails to update, it will throw an exception. If `params.throw` is set to false, an exception will not be thrown and the method will return `undefined`.

The optional params are described in [Model API Params](#model-api-params).    

The `params.add` parameter may be set a value to add to property.
The `params.delete` parameter may be set to a hash, where the hash keys are the property sets to modify and the values are the items in the sets to remove.
The `params.remove` parameter may be set to a list of properties to remove.
The `params.set` parameter may be set to a hash, where the hash keys are the properties to modify and the values are expresions.

The propertys provided to params.add, delete, remove and set are property names (not mapped attribute names).

If a property is specified in the API `properties` first argument and the property is also set in params.set, params.delete, params.remove or params.add, then the params.* property value takes precedence.

For example:

```javascript
await User.update({id: userId}, {delete: {tokens: ['captain']}})
await User.update({id: userId}, {remove: ['special', 'suspended']})
await User.update({id: userId}, {set: {balance: '${balance} + {100}'}})
await User.update({id: userId}, {
    set: {contacts: 'list_append(${contacts} + @{newContacts}'},
    substitutions: {newContacts: ['+15555555555']}
})
```

Set update, the params.exists will default to a true value to ensure the item exists. If set to null, an update will be permitted to create an item if it does not already exist.

#### Model API params

The are the parameter values that may be supplied to various `Model` and `Table` APIs that accept a `params` argument.

| Property | Type | Description |
| -------- | :--: | ----------- |
| add | `object` | Used to atomically add a value to an attribute. Set to an object containing the attribute name and value to add. Example: add: {balance: 1}|
| batch | `object` | Accumulated batched API calls. Invoke with `Table.batch*`|
| capacity | `string` | Set to `INDEXES`, `TOTAL`  or `NONE` to control the capacity metric. Returned in items.capacity|
| consistent | `boolean` | Set to true to stipulate that consistent reads are required.|
| context | `object` | Optional context hash of properties to blend with API properties when creating or updating items. This overrides the Table.context. Setting to `{}` is a useful one-off way to ignore the context for this API. |
| count | `boolean` | Return a count of matching items instead of the result set for a find/query. The count is returned as a `count` property in the returned items array. Default false. |
| delete | `object` | Used to delete items from a `set` attribute. Set to an object containing the attribute name and item to delete. Example: delete: {colors: 'blue'}|
| execute | `boolean` | Set to true to execute the API. If false, return the formatted command and do not execute. Defaults to true.|
| exists | `boolean` | Set to true for `create`, `delete` or `update` APIs to verify if an item of the same key exists or not. Defaults to false for `create`, null for `delete` and true for `update` Set to null to disable checking either way.|
| fields | `array` | List of properties to return. This sets the ProjectionExpression. Default null. |
| hidden | `boolean` | Hide key attributes in Javascript properties. Overrides model.hidden. Default null. |
| index | `string` | Name of index to utilize. Defaults to 'primary'|
| limit | `number` | Set to the maximum number of items to return from a find / scan.|
| log | `boolean` | Set to true to force the API call to be logged at the 'data' level. Requires that a 'logger' be defined via the Table constructor. Defaults to false.|
| many | `boolean` | Set to true to enable deleting multiple items. Default to false.|
| next | `object` | Starting key for the result set. This is used to set the ExclusiveStartKey when doing a find/scan. Typically set to the result.next value returned on a previous find/scan. |
| prev | `object` | Starting key for the result set when requesting a previous page. This is used to set the ExclusiveStartKey when doing a find/scan in reverse order. Typically set to the result.prev value returned on a previous find/scan.|
| parse | `boolean` | Parse DynamoDB response into native Javascript properties. Defaults to true.|
| postFormat | `function` | Hook to invoke on the formatted API command just before execution. Passed the `model` and `cmd`, expects updated `cmd` to be returned. Cmd is an object with properties for the relevant DynamoDB API.|
| remove | `array` | Set to a list of of attributes to remove from the item.|
| return | `string` | Set to 'ALL_NEW', 'ALL_OLD', 'NONE', 'UPDATED_OLD' or 'UPDATED_NEW'. The `created` and `updated` APIs will always return the item properties. This parameter controls the `ReturnValues` DynamoDB API parameter.|
| reverse | `boolean` | Set to true to reverse the order of items returned.|
| select | `string` | Determine the returned attributes. Set to ALL_ATTRIBUTES | ALL_PROJECTED_ATTRIBUTES | SPECIFIC_ATTRIBUTES | COUNT. Note: recommended to use params.count instead of COUNT. Default to ALL_ATTRIBUTES. |
| set | `object` | Used to atomically set attribute vaules to an expression value. Set to an object containing the attribute names and values to assign. The values are expressions similar to Where Clauses with embedded ${attributeReferences} and {values}. See [Where Clause](#where-clauses) for more details. |
| stats | `object` | Set to an object to receive performance statistics for find/scan. Defaults to null.|
| substitutions | `object` | Variables that can be referenced in a where clause. Values will be added to ExpressionAttributeValues when used.|
| throw | `boolean` | Set to false to not throw exceptions when an API request fails. Defaults to true.|
| transaction | `object` | Accumulated transactional API calls. Invoke with `Table.transaction` |
| type | `string` | Add a `type` condition to the `create`, `delete` or `update` API call. Set `type` to the DynamoDB required type.|
| updateIndexes | `boolean` | Set to true to update index attributes. The default during updates is to not update index values (either primary or secondard) which are defined during create.|
| where | `string` | Define a filter or update conditional expression template. Use `${attribute}` for attribute names, `@{var}` for variable substituions and `{value}` for values. OneTable will extract attributes and values into the relevant ExpressionAttributeNames and ExpressionAttributeValues.|

If `stats` is defined, find/query/scan operations will return the following statistics in the stats object:

* count -- Number of items returned
* scanned -- Number of items scanned
* capacity -- DynamoDB consumed capacity units

The `transform` property may be used to format data prior to writing into the database and parse it when reading back. This can be useful to convert to alternate data representations in your table. The transform signature is:

```javascript
value = transform(model, operation, name, value, properties)
```

The `operation` parameter is set to `read` or `write`. The `name` argument is set to the field attribute name.


<a name="where-clauses"></a>
#### Where Clauses

OneTable `where` clauses are a convenient way to express DynamoDB filter expressions. DynamoDB ExpressionAttributeNames and Values are one of the least fun parts of DynamoDB. OneTable makes this much easier via the use of templated `where` clauses to express complex filter expressions.

A `where` clause may be used with `find`, `scan`, `create`, `delete` or `update` APIs to specify a Filter or Conditional update expression. OneTable will parse the `where` clause and extract the names and values to use with the DynamoDB API.

For example:

```javascript
let adminUsers = await User.find({}, {
    where: '(${role} = {admin}) and (${status} = @{status})',
    substitutions: {
        status: 'current'
    }
})
```

OneTable will extract property names defined inside `${}` braces, variable substitutions in `@{}` braces and values inside `{}` braces and will automatically define your filter or conditional expressions and the required ExpressionAttributeNames and ExpressionAttributeValues.

If a value inside `{}` is a number, it will be typed as a number for DynamoDB. To force a value to be treated as a string, wrap it in quotes, for example: `{"42"}`.

Note: the property name is an unmapped schema property name and not a mapped attribute name.

Substutions also support a `splat` syntax for use with filterExpressions and the `IN` operator.

With this syntax, the list is expanded in-situ and each list item is defined as a separate ExpressionAttributeValue.

```javascript
let adminUsers = await User.find({}, {
    where: '(${role} IN @{...roles})',
    substitutions: {
        roles: ['user', 'admin']
    }
})

##### Where Clause Operators

You can use the following operators with a `where` clause:

```javascript
< <= = <> >= >
AND OR NOT BETWEEN IN
()
attribute_exists()
attribute_not_exists()
attribute_type()
begins_with()
contains()
not_contains()
size
```

Where clauses when used with `find` or `scan` on non-key attribugtes can also use the `<>` not equals operator.

See the [AWS Comparison Expression Reference](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html) for more details.


#### Error Handling

API errors will throw an instance of the `OneError` class. This instance has the following properties:

* message &mdash; Text error message.
* code &mdash; Set to a string error code indicating the class of error.
* context &mdash; Map of additional context information.


#### Using `postFormat` to customize the final API request

In cases where you cannot acheive what you need through the OneTable APIs, you can customize the final request to DynamoDB using `postFormat`. For a contrived example, imagine if you needed to add an extra ExpressionAttributeValues, you could do:

```
await RouteModel.update({ routeId }, {
    set: { myField: ':myValue' },
    postFormat: (model, args) => {
        const extraValues = marshall({ ':myValue': { 'complex': 'Some kind of complex value' } })
        args.ExpressionAttributeValues = { ...extraValues, ...args.ExpressionAttributeValues }
        return args
    }
})
```

### References

- [OneTable Samples](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples)
- [OneTable Schema Specification](https://github.com/sensedeep/dynamodb-onetable/blob/main/doc/schema-1.0.0.md)
- [OneTable Tests](https://github.com/sensedeep/dynamodb-onetable/tree/main/test)
- [SenseDeep Blog](https://www.sensedeep.com/blog/)
- [DynamoDB Checklist](https://www.sensedeep.com/blog/posts/2021/dynamodb-checklist.html)
- [DynamoDB Articles](https://www.sensedeep.com/blog/posts/series/dynamodb/dynamodb-series.html)
- [DynamoDB Book](https://www.dynamodbbook.com/)
- [Alex DeBrie Best Practices Video](https://www.youtube.com/watch?v=8Ww1YW3AChE)
- [DocumentClient SDK Reference](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html)
- [DynamoDB Guide](https://www.dynamodbguide.com/)
- [Best Practices for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

### Participate

All feedback, discussion, contributions and bug reports are very welcome.

* [discussions](https://github.com/sensedeep/dynamodb-onetable/discussions)
* [issues](https://github.com/sensedeep/dynamodb-onetable/issues)

### Contact

You can contact me (Michael O'Brien) on Twitter at: [@mobstream](https://twitter.com/mobstream), or [email](mob-pub-18@sensedeep.com) and ready my [Blog](https://www.sensedeep.com/blog).

### SenseDeep

Please try our Serverless Developer Studio [SenseDeep](https://www.sensedeep.com/).
