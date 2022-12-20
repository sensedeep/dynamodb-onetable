/*
    Demonstrate simple CRUD with OneTable

    This sample runs its own local dynamodb instance on port 4567
 */

import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import DynamoDbLocal from 'dynamo-db-local'

//  For AWS V3
// import Dynamo from 'dynamodb-onetable/Dynamo'
// import { Table } from 'dynamodb-onetable'

//  To debug locally
import Dynamo from '../../../dist/mjs/Dynamo.js'
import {Table} from '../../../dist/mjs/index.js'

const PORT = 4567

const client = new Dynamo({
    client: new DynamoDBClient({
        region: 'local',
        endpoint: `http://localhost:${PORT}`,
    }),
})

/*
    Single-table schema and setup. This is used for general access and by `createTable`
 */
const table = new Table({
    name: 'TestCrud',
    client: client,
    logger: true,
    partial: false,
    schema: {
        format: 'onetable:1.1.0',
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
            gs1: {hash: 'gs1pk', sort: 'gs1sk'},
        },
        models: {
            User: {
                pk: {type: String, value: 'user#${id}'},
                sk: {type: String, value: 'user#${id}'},
                id: {type: String, generate: 'ulid'},
                name: {type: String, required: true},
                status: {type: String, default: 'active'},
                zip: {type: String},

                gs1pk: {type: String, value: 'sec#${name}'},
                gs1sk: {type: String, value: 'sec#${id}'},
            },
        },
        params: {
            isoDates: true,
            timestamps: true,
        },
    },
})

//  Create a model to manage User entities
const User = table.getModel('User')

let dynamodb = null

async function start() {
    //  Start the dynamodb instance and then short wait for it to open a listening port.
    dynamodb = DynamoDbLocal.spawn({port: PORT})
    await delay(1000)
}

async function stop() {
    process.kill(dynamodb.pid)
}

async function test() {
    await table.createTable()

    let user = await User.create(
        {
            name: 'Peter Smith',
        },
        {log: true}
    ) //  Emit console trace for the command and result
    console.log('CREATED user', user)

    user = await User.update({id: user.id, status: 'inactive'})
    console.log('UPDATED user', user)

    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    console.log('UPDATED user', user)

    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk']})
    console.log('UPDATED user', user)

    //  Scan is not normally advised -- scans entire table
    let users = await User.scan({})
    console.log('FOUND users', users)

    for (let user of users) {
        await User.remove({id: user.id})
    }

    //  Cleanup. The argument is a safety string
    await table.deleteTable('DeleteTableForever')

    process.kill(dynamodb.pid)
}

async function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(() => resolve(true), time)
    })
}

async function main() {
    await start()
    try {
        await test()
    } catch (err) {
        console.error(err)
    }
    await stop()
}

main()
