DynamoDB OneTable
===

DynamoDB OneTable is a Javascript access and management library for Node applications to easily use one table design patterns with AWS DynamoDB. It provides a low level wrapping of DynamoDB APIs and also a higher level API with increased functionality.

### Features

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

    npm i @sensedeep/dynamodb-onetable

## Quick Tour

Import the library and define the local references

    import {Model, Table} from 'dynamodb-onetable'


Initialize your your Dynamo table instance

    const table = new Table({
        schema: this.schema,
        table: 'MyTable',
    })

Define your Models

    const Account = new Model(table, {
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
