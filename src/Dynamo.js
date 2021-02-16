/*
    Dynamo.js -- AWS V3 SDK API

    import {Dynamo, Model, Table} from 'dynamodb-onetable'
    const dynamo = new Dynamo(params)
    const table = new Table({ dynamo, ... })
*/

import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    DeleteItemCommand,
    DynamoDBClient,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    ScanCommand,
    TransactGetItemsCommand,
    TransactWriteItemsCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'

import Utils from '@aws-sdk/util-dynamodb'

export default class Dynamo {
    constructor(params) {
        this.dynamo = params.dynamo || new DynamoDBClient(params)
        this.marshall = Utils.marshall
        this.unmarshall = Utils.unmarshall
    }

    async delete(params) {
        let command = new DeleteItemCommand(params)
        return await this.send(command)
    }

    async get(params) {
        let command = new GetItemCommand(params)
        return await this.send(command)
    }

    async find(params) {
        let command = new QueryCommand(params)
        return await this.send(command)
    }

    async put(params) {
        let command = new PutItemCommand(params)
        return await this.send(command)
    }

    async scan(params) {
        let command = new ScanCommand(params)
        return await this.send(command)
    }

    async update(params) {
        let command = new UpdateItemCommand(params)
        return await this.send(command)
    }

    async batchGet(params) {
        let command = new BatchGetItemCommand(params)
        return await this.send(command)
    }

    async batchWrite(params) {
        let command = new BatchWriteItemCommand(params)
        return await this.send(command)
    }

    async transactGet(params) {
        let command = new TransactGetItemsCommand(params)
        return await this.send(command)
    }

    async transactWrite(params) {
        let command = new TransactWriteItemsCommand(params)
        return await this.send(command)
    }

    async send(cmd) {
        return await this.dynamo.send(cmd)
    }
}
