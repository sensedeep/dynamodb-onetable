import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import AWS, {DynamoDB} from 'aws-sdk'
import Dynamo from '../../src/Dynamo.js'
import {Entity, Model, Table} from '../../src/index.js'

const PORT = parseInt(process.env.DYNAMODB_PORT || '4567')

const dynamoExecutedCommandsTracer = jest.fn()

const ClientV2 = new DynamoDB.DocumentClient({
    endpoint: `http://localhost:${PORT}`,
    region: 'local',
    sslEnabled: false,
    credentials: new AWS.Credentials({
        accessKeyId: 'test',
        secretAccessKey: 'test',
    }),
    logger: {
        log: dynamoExecutedCommandsTracer,
    },
})

const ClientV3 = new Dynamo({
    client: new DynamoDBClient({
        endpoint: `http://localhost:${PORT}`,
        region: 'local',
        credentials: new AWS.Credentials({
            accessKeyId: 'test',
            secretAccessKey: 'test',
        }),
        logger: {
            debug: dynamoExecutedCommandsTracer,
            info: dynamoExecutedCommandsTracer,
            warn: dynamoExecutedCommandsTracer,
            error: dynamoExecutedCommandsTracer,
        },
    }),
})

const isV2 = () => process.env.DDB_CLIENT_VERSION === 'v2'
const isV3 = () => !isV2()

const Client = isV2() ? ClientV2 : ClientV3

const dump = (...args) => {
    let s: string[] = []
    for (let item of args) {
        let values = JSON.stringify(
            item,
            function (key, value) {
                if (this[key] instanceof Date) {
                    return this[key].toLocaleString()
                }
                return value
            },
            4
        )
        s.push(values)
    }
    let result = s.join(' ')
    console.log(result)
    return result
}

const print = (...args) => {
    console.log(...args)
}
globalThis.dump = dump
globalThis.print = print

const delay = async (time) => {
    return new Promise(function (resolve, reject) {
        setTimeout(() => resolve(true), time)
    })
}

const Match = {
    ulid: /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/,
    uuid: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i,
    email: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    name: /^[a-z ,.'-]+$/i,
    address: /[a-z0-9 ,.-]+$/,
    zip: /^\d{5}(?:[-\s]\d{4})?$/,
    phone: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
}

export {AWS, Client, Dynamo, Entity, Match, Model, Table, delay, dump, print, dynamoExecutedCommandsTracer, isV2, isV3}
