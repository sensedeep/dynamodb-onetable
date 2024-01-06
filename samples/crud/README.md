OneTable CRUD sample
===

This sample demonstrates basic CRUD (create, read, update and delete) operations for OneTable.

It has the following features:

* Simple OneTable schema
* Use of per-API logging
* Create, delete and test for existence of a DynamoDB table
* Entity model create, find, update and delete with removing attributes
* AWS V3 SDK
* Starts own DynamoDB instance on port 4567


## Read the Code

* [CRUD Source](/samples/crud/src/index.js)


## Building

```
make configure
make build
```

## Run

```
make run
```

## To debug in VS CODE

```
code .
```

