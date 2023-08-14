/*
    Dynamo.js -- AWS V3 SDK API

    This module provides a wrapper and convenience API over the AWS V3 SDK.
    It is used by OneTable internally and is not a public API.
*/

import {
    BatchGetItemCommand,
    BatchWriteItemCommand,
    CreateTableCommand,
    DeleteItemCommand,
    DeleteTableCommand,
    DescribeTableCommand,
    DynamoDBClient,
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

export interface DynamoParams {
    client: DynamoDBClient,
}

export class Dynamo {
    client: DynamoDBClient // TODO Confirm type
    V3: boolean
    private params: DynamoParams
    marshall: typeof marshall
    unmarshall: typeof unmarshall

    constructor(params: DynamoParams) {
        this.client = params.client
        this.params = params
        this.marshall = marshall
        this.unmarshall = unmarshall
        this.V3 = true
    }

    async createTable(params) {
        const command = new CreateTableCommand(params)
        return await this.send(command)
    }

    async deleteTable(params) {
        const command = new DeleteTableCommand(params)
        return await this.send(command)
    }

    async delete(params) {
        const command = new DeleteItemCommand(params)
        return await this.send(command)
    }

    async describeTable(params) {
        const command = new DescribeTableCommand(params)
        return await this.send(command)
    }

    async get(params) {
        const command = new GetItemCommand(params)
        return await this.send(command)
    }

    async find(params) {
        const command = new QueryCommand(params)
        return await this.send(command)
    }

    async listTables(params) {
        const command = new ListTablesCommand(params)
        return await this.send(command)
    }

    async put(params) {
        const command = new PutItemCommand(params)
        return await this.send(command)
    }

    async scan(params) {
        const command = new ScanCommand(params)
        return await this.send(command)
    }

    async update(params) {
        const command = new UpdateItemCommand(params)
        return await this.send(command)
    }

    async updateTable(params) {
        const command = new UpdateTableCommand(params)
        return await this.send(command)
    }

    async batchGet(params) {
        const command = new BatchGetItemCommand(params)
        return await this.send(command)
    }

    async batchWrite(params) {
        const command = new BatchWriteItemCommand(params)
        return await this.send(command)
    }

    async transactGet(params) {
        const command = new TransactGetItemsCommand(params)
        return await this.send(command)
    }

    async transactWrite(params) {
        const command = new TransactWriteItemsCommand(params)
        return await this.send(command)
    }

    async send(cmd) {
        return await this.client.send(cmd)
    }
}

export default Dynamo
