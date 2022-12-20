/*
    Demonstrate property packing in a single attribute

    Userful to have a single "data" attribute in a GSI that can store multiple properties.
    This is because you can't change the GSI "projects" list after the GSI is created.
    This works around that limitation.
 */

import {DynamoDBClient} from '@aws-sdk/client-dynamodb'
import DynamoDbLocal from 'dynamo-db-local'

//  For AWS V3
// import { Table } from 'dynamodb-onetable'
// import Dynamo from 'dynamodb-onetable/Dynamo'

//  To debug locally
import {Table} from '../../../dist/mjs/index.js'
import Dynamo from '../../../dist/mjs/Dynamo.js'

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
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
            gs1: {hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'data']},
        },
        models: {
            User: {
                pk: {type: String, value: 'user#${id}'},
                sk: {type: String, value: 'user#'},
                id: {type: String, generate: 'ulid'},
                name: {type: String},

                //  Properties packed into the "data" attribute projected to the gs1 secondary index
                address: {type: String, map: 'data.address'},
                city: {type: String, map: 'data.city'},
                zip: {type: String, map: 'data.zip'},

                gs1pk: {type: String, value: 'user#${name}'},
                gs1sk: {type: String, value: 'user#'},
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
    if (!(await table.exists())) {
        await table.createTable()
    }
    /*
        The address, city and zip properties are packed into the single 'data' attribute.
        All packed properties must be provided.
    */
    let user = await User.create(
        {
            name: 'Peter Smith',
            zip: 98011,
            address: '444 Cherry Tree Lane',
            city: 'Seattle',
        },
        {log: true}
    ) //  Emit console trace for the command and result

    console.log('CREATED user', JSON.stringify(user, null, 4))

    user = await User.get({id: user.id})
    console.log('Simple get user by ID', JSON.stringify(user, null, 4))

    //  Without follow will fetch just the GSI data
    let data = await User.find({name: 'Peter Smith'}, {index: 'gs1'})
    console.log('Fetch user via GSI without follow', JSON.stringify(data, null, 4))

    //  With follow, will follow the GSI and fetch the entire user
    let users = await User.find({name: 'Peter Smith'}, {index: 'gs1', follow: true})
    console.log('Fetch user via GSI with follow', JSON.stringify(users, null, 4))

    //  Cleanup. The argument is a safety string
    await table.deleteTable('DeleteTableForever')
}

async function delay(time) {
    return new Promise(function (resolve, reject) {
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
