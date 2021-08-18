/*
    Dynamo.ts -- AWS V3 SDK API

    This module provides a wrapper and convenience API over the AWS V3 SDK.

    Use:
        import {Model, Table} from 'dynamodb-onetable'
        import Dynamo from 'dynamodb-onetable/Dynamo'

        const dynamo = new Dynamo(params)
        const table = new Table({ dynamo, ... })

    */

import {
    AttributeValue,
    BatchGetItemCommand,
    BatchGetItemCommandInput,
    BatchWriteItemCommand,
    BatchWriteItemCommandInput,
    CreateTableCommand,
    CreateTableCommandInput,
    DeleteItemCommand,
    DeleteItemCommandInput,
    DeleteTableCommand,
    DeleteTableCommandInput,
    DescribeTableCommand,
    DescribeTableCommandInput,
    DynamoDBClient,
    GetItemCommand,
    GetItemCommandInput,
    ListTablesCommand,
    ListTablesCommandInput,
    PutItemCommand,
    PutItemCommandInput,
    QueryCommand,
    QueryCommandInput,
    ScanCommand,
    ScanCommandInput,
    TransactGetItemsCommand,
    TransactGetItemsCommandInput,
    TransactWriteItemsCommand,
    TransactWriteItemsCommandInput,
    UpdateItemCommand,
    UpdateItemCommandInput
} from "@aws-sdk/client-dynamodb";
import {
    marshall,
    marshallOptions,
    unmarshall,
    unmarshallOptions
} from "@aws-sdk/util-dynamodb";

interface DynamoParams {
    client?: DynamoDBClient;
    marshall?: <T extends { [K in keyof T]: any }>(
        data: T,
        options?: marshallOptions | undefined
    ) => {
        [key: string]: AttributeValue;
    };
    unmarshall?: (
        data: {
            [key: string]: AttributeValue;
        },
        options?: unmarshallOptions | undefined
    ) => {
        [key: string]: any;
    };
}

export class Dynamo {
    client: DynamoDBClient;
    params: any;
    V3: boolean;
    marshall: <T extends { [K in keyof T]: any }>(
        data: T,
        options?: marshallOptions | undefined
    ) => {
        [key: string]: AttributeValue;
    };
    unmarshall: (
        data: {
            [key: string]: AttributeValue;
        },
        options?: unmarshallOptions | undefined
    ) => {
        [key: string]: any;
    };

    constructor(params: DynamoParams = {}) {
        this.client = params.client;
        this.params = params;
        this.marshall = marshall;
        this.unmarshall = unmarshall;
        this.V3 = true;
    }

    async createTable(params: CreateTableCommandInput) {
        let command = new CreateTableCommand(params);
        return await this.client.send(command);
    }

    async deleteTable(params: DeleteTableCommandInput) {
        let command = new DeleteTableCommand(params);
        return await this.client.send(command);
    }

    async delete(params: DeleteItemCommandInput) {
        let command = new DeleteItemCommand(params);
        return await this.client.send(command);
    }

    async describeTable(params: DescribeTableCommandInput) {
        let command = new DescribeTableCommand(params);
        return await this.client.send(command);
    }

    async get(params: GetItemCommandInput) {
        let command = new GetItemCommand(params);
        return await this.client.send(command);
    }

    async find(params: QueryCommandInput) {
        let command = new QueryCommand(params);
        return await this.client.send(command);
    }

    async listTables(params: ListTablesCommandInput) {
        let command = new ListTablesCommand(params);
        return await this.client.send(command);
    }

    async put(params: PutItemCommandInput) {
        let command = new PutItemCommand(params);
        return await this.client.send(command);
    }

    async scan(params: ScanCommandInput) {
        let command = new ScanCommand(params);
        return await this.client.send(command);
    }

    async update(params: UpdateItemCommandInput) {
        let command = new UpdateItemCommand(params);
        return await this.client.send(command);
    }

    async batchGet(params: BatchGetItemCommandInput) {
        let command = new BatchGetItemCommand(params);
        return await this.client.send(command);
    }

    async batchWrite(params: BatchWriteItemCommandInput) {
        let command = new BatchWriteItemCommand(params);
        return await this.client.send(command);
    }

    async transactGet(params: TransactGetItemsCommandInput) {
        let command = new TransactGetItemsCommand(params);
        return await this.client.send(command);
    }

    async transactWrite(params: TransactWriteItemsCommandInput) {
        let command = new TransactWriteItemsCommand(params);
        return await this.client.send(command);
    }
}

export default Dynamo;
