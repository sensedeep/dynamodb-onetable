SenseDeep Logging Access sample
===

This sample demonstrates access to logging data in a SenseDeep database table in your account.

SenseDeep provides open access to the log database and publishes the log data schema
so you create your own log analysis capabilities. This is an open, transparent architecture
for logging needs.

It has the following features:

* Retrieve a list of logs and display

* Select a sample of log events and display

* Retrieve list of most recent events for a log

* Includes SenseDeep OneTable schema in schema.js

## Read the Code

* [SenseDeep Database Access](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/sensedeep/src/index.js)
* [SenseDeep Database Schema](https://github.com/sensedeep/dynamodb-onetable/tree/main/samples/sensedeep/src/schema.js)

## Requirements

* Activate SenseDeep and configure a cloud in your AWS account

* Set AWS_PROFILE to credentials in ~/.aws/cred* or modify src/index.js to
    define your AWS credentials.

* Modify src/index.js to select a log group from which to read events.

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
