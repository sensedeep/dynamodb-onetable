![OneTable](https://www.sensedeep.com/images/ring-short.png)

_One Table to Rule Them All_

[![Build Status](https://img.shields.io/github/actions/workflow/status/sensedeep/dynamodb-onetable/build.yml?branch=main)](https://img.shields.io/github/actions/workflow/status/sensedeep/dynamodb-onetable/build.yml?branch=main)
[![npm](https://img.shields.io/npm/v/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)
[![npm](https://img.shields.io/npm/l/dynamodb-onetable.svg)](https://www.npmjs.com/package/dynamodb-onetable)
[![Coverage Status](https://coveralls.io/repos/github/sensedeep/dynamodb-onetable/badge.svg?branch=main)](https://coveralls.io/github/sensedeep/dynamodb-onetable?branch=main)

## The Easiest Way to Create DynamoDB Single Table Designs.

OneTable is the most evolved API for DynamoDB. It provides a dry, high-level, elegant syntax while enabling full access to the DynamoDB API.

OneTable works with JavaScript and TypeScript. For TypeScript, OneTable will create fully typed entities from your data schemas automatically.

## Full Documentation

-   [OneTable Documentation](https://doc.onetable.io/)

## OneTable Features

-   Schema supported one-table access to DynamoDB APIs.
-   Efficient storage and access of multiple entities in a single DynamoDB table.
-   High level API with type marshaling, validations, and extended query capability for get/delete/update operations.
-   Bidirectional conversion of DynamoDB types to Javascript types.
-   Generation of Conditional, Filter, Key and Update expressions.
-   Schema item definitions for attribute types, default values, enums, unique attributes and validations.
-   Option to invoke DynamoDB or simply generate API parameters.
-   Powerful field level validations with "required" and "unique" attributes.
-   Easy parameterization of filter and conditional queries.
-   Detailed metrics for Table, Tenant, Source, Index, Model and Operation.
-   Multi-page response aggregation.
-   Compound and templated key management.
-   Attribute mapping and packing.
-   Support for sparse GSIs that project keys and overloaded attributes.
-   Encrypted fields.
-   CreateTable, DeleteTable table and index admin operations.
-   Support for Batch, Transactions, GSI, LSI indexes.
-   Intercept hooks to modify DynamoDB requests and responses.
-   Controllable logging to see exact parameter, data and responses.
-   Simple and easy to read source.
-   Integrated statistics.
-   Safety options to prevent "rm -fr \*".
-   TypeScript type inference from schema for full type validation on APIs, parameters, returns, and entities and attributes.
-   Migrations support via [OneTable Migrate](https://github.com/sensedeep/onetable-migrate) and [OneTable CLI](https://github.com/sensedeep/onetable-cli).
-   Graphical monitoring of single-table performance via [SenseDeep](https://www.sensedeep.com).

## Installation

    npm i dynamodb-onetable

## Quick Tour

Import the OneTable library. If you are not using ES modules or TypeScript, use `require` to import the libraries.

```javascript
import {Table} from 'dynamodb-onetable'
```

Import the `DynamoDBClient` class and create a `DynamoDBClient` instance.

```javascript
import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
const client = new DynamoDBClient({
    endpoint: `http://localhost:${PORT}`,
    region: 'local',
    credentials: new AWS.Credentials({
        accessKeyId: 'test',
        secretAccessKey: 'test',
    }),
})
```

If you are using the legacy AWS SDK V2, import the AWS `DynamoDB` class and create a `DocumentClient` instance.

```javascript
import DynamoDB from 'aws-sdk/clients/dynamodb'
const client = new DynamoDB.DocumentClient(params)
```

Note: you can use the Table.setClient API to defer setting the client or replace the client at any time.

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
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', follow: true},
        ls1: {sort: 'id', type: 'local'},
    },
    models: {
        Account: {
            pk: {type: String, value: 'account:${id}'},
            sk: {type: String, value: 'account:'},
            id: {type: String, generate: 'ulid', validate: /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/i},
            name: {type: String, required: true},
            status: {type: String, default: 'active'},
            zip: {type: String},
        },
        User: {
            pk: {type: String, value: 'account:${accountName}'},
            sk: {type: String, value: 'user:${email}', validate: EmailRegExp},
            id: {type: String, required: true},
            accountName: {type: String, required: true},
            email: {type: String, required: true},
            firstName: {type: String, required: true},
            lastName: {type: String, required: true},
            username: {type: String, required: true},
            role: {type: String, enum: ['user', 'admin'], required: true, default: 'user'},
            balance: {type: Number, default: 0},

            gs1pk: {type: String, value: 'user-email:${email}'},
            gs1sk: {type: String, value: 'user:'},
        },
    },
    params: {
        isoDates: true,
        timestamps: true,
    },
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

let users = await User.find(
    {accountId: account.id},
    {
        where: '${balance} > {100.00}',
    }
)

//  Get a count of matching users without returning the actual items
let users = await User.find({accountId: account.id, role: 'admin'}, {count: true})
let count = users.count
```

To update an item:

```javascript
await User.update({id: userId, balance: 50})
await User.update({id: userId}, {add: {balance: 10.0}})
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

//  Fully typed Account object based on the schema
type Account = Entity<typeof MySchema.models.Account>

let account: Account = {
    name: 'Coyote',        //  OK
    unknown: 42,           //  Error
}

let AccountModel: Model<Account> = table.getModel('Account')

let account = await AccountModel.create({
    name: 'Acme',               //  OK
    unknown: 42,                //  Error
})

account.name = 'Coyote'         //  OK
account.unknown = 42            //  Error
```

### DynamoDB Articles

Here is a collection of articles that can help you on your way with DynamoDB and OneTable.

DynamoDB Topic|Link
-|-
Intro to DynamoDB| [https://www.sensedeep.com/blog/posts/2021/dynamodb-onetable-tour.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-onetable-tour.html)
Data Modeling for DynamoDB | [https://www.sensedeep.com/blog/posts/2021/dynamodb-singletable-design.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-singletable-design.html)
The What and Why of Single Table Design | [https://www.alexdebrie.com/posts/dynamodb-single-table/](https://www.alexdebrie.com/posts/dynamodb-single-table/)
DynamoDB with OneTable Schemas | [https://www.sensedeep.com/blog/posts/2021/dynamodb-schemas.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-schemas.html)
DynamoDB OneTable API Overview | [https://www.sensedeep.com/blog/posts/2021/dynamodb-onetable-tour.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-onetable-tour.html)
DynamoDB Checklist | [https://www.sensedeep.com/blog/posts/2021/dynamodb-checklist.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-checklist.html)
DynamoDB with TypeScript | [https://www.sensedeep.com/blog/posts/2021/dynamodb-typescript.html](https://www.sensedeep.com/blog/posts/2021/dynamodb-typescript.html)
DynamoDB Sparse GSIs | [https://www.sensedeep.com/blog/posts/2021/sparse-gsi-indexes.html](https://www.sensedeep.com/blog/posts/2021/sparse-gsi-indexes.html)
DynamoDB Attribute Packing | [https://www.sensedeep.com/blog/posts/2021/attribute-packing.html](https://www.sensedeep.com/blog/posts/2021/attribute-packing.html)
Evolving DynamoDB Designs | [https://www.sensedeep.com/blog/posts/2021/evolving-dynamodb-designs.html](https://www.sensedeep.com/blog/posts/2021/evolving-dynamodb-designs.html)
SenseDeep Migration Manager | [https://www.sensedeep.com/blog/posts/series/dynamodb-studio/migration-manager.html](https://www.sensedeep.com/blog/posts/series/dynamodb-studio/migration-manager.html)
SenseDeep DynamoDB Studio | [https://www.sensedeep.com/blog/posts/stories/dynamodb-studio.html](https://www.sensedeep.com/blog/posts/stories/dynamodb-studio.html)
SenseDeep DynamoDB Quick Tour | [https://www.sensedeep.com/blog/posts/product/dynamodb-tour.html](https://www.sensedeep.com/blog/posts/product/dynamodb-tour.html)


### Serverless Articles

And a few serverless articles:

Serverless Topic|Link
-|-
How to Debug Serverless Apps | [https://www.sensedeep.com/blog/posts/stories/how-to-debug-serverless-apps.html](https://www.sensedeep.com/blog/posts/stories/how-to-debug-serverless-apps.html)
How to invoke HTTP without Waiting from Lambda | [https://www.sensedeep.com/blog/posts/stories/lambda-fast-http.html](https://www.sensedeep.com/blog/posts/stories/lambda-fast-http.html)
Fast Logging with Lambda | [https://www.sensedeep.com/blog/posts/senselogs/serverless-logging.html](https://www.sensedeep.com/blog/posts/senselogs/serverless-logging.html)

### SenseDeep

Please try our [SenseDeep Serverless Developer Studio](https://www.sensedeep.com/) that includes a full DynamoDB suite with single-table aware data browser, single-table designer, migration manager, provisioning planner and metrics.

![SenseDeep Developer Studio](https://www.sensedeep.com/images/sensedeep/table-browse.png).
