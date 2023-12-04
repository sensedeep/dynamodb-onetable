OneTable Packed Attributes sample
===

This sample demonstrates how to pack properties into a single attribute. Useful when projecting a single data attribute to a GSI.

This demonstrates the techniques discussed in:

https://www.sensedeep.com/blog/posts/2021/attribute-packing.html

It has the following features:

* Simple OneTable schema
* Packing attributes into a single data attribute
* AWS V3 SDK

## Read the Code

* [Packed Attributes Source](/samples/packed/src/index.js)

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

## To debug in VS CODE

```
code .
```
