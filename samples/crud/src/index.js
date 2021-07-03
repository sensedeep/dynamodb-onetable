/*
    Demonstrate simple CRUD with OneTable

    This sample runs its own local dynamodb instance on port 4567
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import DynamoDbLocal from 'dynamo-db-local'

//  For AWS V3
// import Dynamo from 'dynamodb-onetable/Dynamo'
// import { Table } from 'dynamodb-onetable'

//  To debug locally
import Dynamo from '../../../dist/mjs/Dynamo.js'
import { Table } from '../../../dist/mjs/index.js'

/*
    Start the DynamoDB instance
*/
const PORT = 4567
let dynamodb = DynamoDbLocal.spawn({port: PORT})
// process.env.DYNAMODB_PID = dynamodb.pid
// process.env.DYNAMODB_PORT = PORT.toString()

const client = new Dynamo({
    client: new DynamoDBClient({
        region: 'local',
        endpoint: `http://localhost:${PORT}`,
    })
})

/*
    Single-table schema and setup. This is used for general access and by `createTable`
 */
const table = new Table({
    name: 'TestCrud',
    client: client,
    uuid: 'ulid',
    delimiter: '#',
    logger: true,
    schema: {
        indexes: {
            primary: { hash: 'pk', sort: 'sk' },
            gs1:     { hash: 'gs1pk', sort: 'gs1sk' },
        },
        models: {
            User: {
                pk:          { type: String, value: 'user#${id}' },
                sk:          { type: String, value: 'user#${id}' },
                id:          { type: String, uuid: true },
                name:        { type: String, required: true },
                status:      { type: String, default: 'active' },
                zip:         { type: String },

                gs1pk:       { type: String, value: 'sec#${name}' },
                gs1sk:       { type: String, value: 'sec#${id}' },
            }
        }
    },
})

//  Create a model to manage User entities
const User = table.getModel('User')

async function main() {

    if (!(await table.exists())) {
        await table.createTable()
    }

    let user = await User.create({
        name: 'Peter Smith',
    }, { log: true })                  //  Emit console trace for the command and result
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
}

main()
