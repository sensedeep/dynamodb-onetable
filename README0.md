DynamoDB OneTable (DOT)
===

DynamoDB OneTable (DOT) is a Javascript library for Node applications to easily use one table design patterns with AWS DynamoDB.
It provides a low level wrapping of DynamoDB APIs and also a higher level API with increased functionality.

DOT provides:

* Efficient storage of multiple entities in a single DynamoDB table
* Table schemas
* Automatic bi-directional conversion of DynamoDB types to Javascript types including Date management with custom hooks
* Automatic generation of Conditional, Filter, Update expressions
* Composite and templated key management
* Automated multi-page response aggregation
* Global and local index support
* Easy parameterization of filter and conditional queries
* Transactions
* Composite sort key
* Management of DynamoDB keys for entities
* Entity field data validations
* Schema migration assistance
* No module dependencies
* Simple, easy to read source to modify (< 1000 lines)
* Optional high level API to give query capability to get/delete/update operations
* Unique non-key fields and required fields
* Extensive controllable logging to see exact parameter, data and responses
* Hooks to modify DynamoDB requests and responses
* Option to generate API parameters or to execute
* Safety options to prevent "rm -fr *"

## Installation

    npm i dynamodb-onetable

## Quick Tour

Import the library and define the local references

    import {Dynamo, Model} from 'dynamodb-onetable'


Initialize your your Dynamo table instance

    const Dynamo = new Dynamo({
        schema: this.schema,
        table: 'MyTable',
    })

Define your Models

    const Account = new Model({
        name: 'Account',
        fields: {
            pk: { value: 'account:${id}' },
            sk: { value: 'account:' },
            id: { type: String },
            name: { type: String },
        },
    })

Create an item

    await Account.create({
        id: 42,
        name: 'Acme Airplanes'
    })

Get an item

    let account = await Account.get({id: 42})

See more examples under the [Examples Directory](./examples)

## What is Unique

Reference DynamoDB toolbox


## Features

## Contents


### Overview

### Single Table Design


### Dynamo Tables

#### Dynamo Methods

The Dynamo constructor takes a parameter of type `object` with the following properties:

| Property | Type | Required | Description |
| -------- | :--: | :--: | ----------- |
| client | `object` | no | Optional properties defining your connection to AWS DynamoDB |
| crypto | `object` | no | Optional properties defining a crypto configuration to encrypt properties |
| logger | `object` | no | Logging ... |
| schema | `string` | yes | Definition of your DynamoDB indexes and models |
| table | `string` | yes | The name of your DynamoDB table |
| client | `DocumentClient` | no | An AWS [DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html) instance |

#### Example

    const Dynamo = new Dynamo({
        connection: {
            region: 'us-east-1'
        }
        schema: this.schema,
        table: 'MyTable',
    })

#### Dynamo Properties

### Models

Overview about highlevel methods

#### Model Higher-lelel Methods

- create, get, find, remove, scan, update

#### Model Lower-lelel Methods

- createItem, removeItem, findItem, getItem, updateItem

#### Model Properties

### Transactions

### Pagination

### Migrations

### Things to Remember

#### Multi-item queries

### Designing Keys for One Table Patterns

### References

https://github.com/jeremydaly/dynamodb-toolbox#readme

### Sponsors

### Participate

-END-


/*
let batch = {}

await db.create('Cloud', {id:'6e6d360cb761c9a6b618be29e5b22b00', accountId: 4, pollPeriod: 7, regions: 'us-east-1', name: 'aaa'}, {batch})
await db.create('Cloud', {id:'6e6d360cb761c9a6b618be29e5b22b01', accountId: 4, enable: false, regions: 'us-east-1', name: 'bbb'}, {batch})
let result = await db.batchWrite(batch)

/* MOBZZ
let dd = await db.update('Cloud', {id, pollPeriod: 7})
dump("DD", dd)
dd = await db.update('Cloud', {id, pollPeriod: 1}, {where: '${enable} = {true}'})
dump("DD", dd)

dd = await db.update('Cloud', {id, pollPeriod: 1}, {where: '${name} = {sample}'})
dump("DD", dd)

dd = await db.update('Cloud', {id}, {add: {pollPeriod: 2}})
dump("DD", dd)

let items = await db.scanItems({}, {parse: true, limit: 1})
dump("ITEMS", items)
while (items.length) {
    items = await items.next()
    dump("ITEMS", items)
}

let items = await db.scanItems({}, {parse: true, where: 'contains(${email}, {mob@})'})
for (let item of items) {
    print('\n' + item.type)
    dump(item)
}
try {
    let items = await db.queryItems({pk: `org:${req.orgId}`}, {parse: true})

    let u
    let u = await db.find('Log', { title: 'Sample App' })
    u = await db.find('Log', {}, { where: '${title} = {Sample App}' })
    u = await db.find('Log', {}, { where: '${title} = {Sample App} and ${format} = {json}' })
    u = await db.find('Log', {}, { where: '${updated} >= {1610150280246}' })

    print("HERE")
    u = await db.create('User', {id: 42, email: 'mob@emobrien.comx', role: 'admin'}, { exists: false})
    dump("AA", u)

    u = await db.find('Log', {}, { where: '${title} = {"Sample App"}' })
    dump("AA", u)
    u = await db.find('Log', {}, { where: '${title} = {Sample App}' })
    dump("BB", u)
    u = await db.find('Log', {}, { where: '${updated} >= {1610150280246}' })
    dump("CC", u)
    print("HERE")
} catch (err) {
    dump("ERR", err)
}
*/
