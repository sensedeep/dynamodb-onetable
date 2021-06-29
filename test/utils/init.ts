import AWS from 'aws-sdk'
import Dynamo from '../../src/Dynamo.js'
import { Entity, Model, Table } from '../../src/index.js'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'

const PORT = parseInt(process.env.DYNAMODB_PORT)

//  TODO - should also test V2
const Client = new Dynamo({
    client: new DynamoDBClient({
        endpoint: `http://localhost:${PORT}`,
        region: 'local',
        // region: 'us-east-1',
        credentials: new AWS.Credentials({
            accessKeyId: 'test',
            secretAccessKey: 'test',
        }),
    })
})


const dump = (...args) => {
    let s = []
    for (let item of args) {
        s.push(JSON.stringify(item, function (key, value) {
            if (this[key] instanceof Date) {
                return this[key].toLocaleString()
            }
            return value
        }, 4))
    }
    console.log(s.join(' '))
}

const print = (...args) => {
    console.log(...args)
}

const delay = async (time) => {
    return new Promise(function(resolve, reject) {
        setTimeout(() => resolve(true), time)
    })
}

const Match = {
    ulid: /^[0-9A-Z]{26}$/i,
    uuid: /^[0-9A-F]{32}$/i,
}

export {AWS, Client, Entity, Match, Model, Table, delay, dump, print}
