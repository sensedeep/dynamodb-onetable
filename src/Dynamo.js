/*
    Dynamo.js -- AWS V3 SDK API

    import {Model, Table} from 'dynamodb-onetable'
    import Dynamo from 'dynamodb-onetable/Dynamo'

    const dynamo = new Dynamo(params)
    const table = new Table({ dynamo, ... })
*/

import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    DeleteItemCommand,
    GetItemCommand,
    PutItemCommand,
    QueryCommand,
    ScanCommand,
    TransactGetItemsCommand,
    TransactWriteItemsCommand,
    UpdateItemCommand,
} from '@aws-sdk/client-dynamodb'

import {marshall, unmarshall} from '@aws-sdk/util-dynamodb'

export class Dynamo {
    constructor(params = {}) {
        this.client = params.client
        this.params = params
        this.marshall = marshall
        this.unmarshall = unmarshall
        this.V3 = true
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
        return await this.client.send(cmd)
    }
}

export default Dynamo
