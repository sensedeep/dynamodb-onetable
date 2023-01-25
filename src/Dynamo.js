/*
    Dynamo.js -- AWS V3 SDK API

    This module provides a wrapper and convenience API over the AWS V3 SDK.
    It is used by OneTable internally and is not a public API.

    Use:
        import {Model, Table} from 'dynamodb-onetable'
        import Dynamo from 'dynamodb-onetable/Dynamo'

        const dynamo = new Dynamo(params)
        const table = new Table({ dynamo, ... })
*/

import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    CreateTableCommand,
    DeleteItemCommand,
    DeleteTableCommand,
    DescribeTableCommand,
    GetItemCommand,
    ListTablesCommand,
    PutItemCommand,
    QueryCommand,
    ScanCommand,
    TransactGetItemsCommand,
    TransactWriteItemsCommand,
    UpdateItemCommand,
    UpdateTableCommand,
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

    async createTable(params) {
        let command = new CreateTableCommand(params)
        return await this.send(command)
    }

    async deleteTable(params) {
        let command = new DeleteTableCommand(params)
        return await this.send(command)
    }

    async delete(params) {
        let command = new DeleteItemCommand(params)
        return await this.send(command)
    }

    async describeTable(params) {
        let command = new DescribeTableCommand(params)
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

    async listTables(params) {
        let command = new ListTablesCommand(params)
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

    async updateTable(params) {
        let command = new UpdateTableCommand(params)
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
