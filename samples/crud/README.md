OneTable CRUD sample
===

This sample demonstrates basic CRUD (create, read, update and delete) operations for OneTable.

It has the following features:

* Simple OneTable schema
* Use of per-API logging
* Create, delete and test for existence of a DynamoDB table
* Entity model create, find, update and delete with removing attributes
* AWS V3 SDK

## Requirements

* DynamoDB instance on localhost:8000.

Read [Local DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) for a local DynamoDB.

## Building

```
make configure
make build
```

## Run

```
make run
```
