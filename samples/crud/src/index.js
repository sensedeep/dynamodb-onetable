/*
    Simple CRUD with OneTable
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Table } from 'dynamodb-onetable'

//  For AWS V3
import Dynamo from 'dynamodb-onetable/Dynamo'

//  To debug locally
//  import { Table } from '../../../dist/mjs/index.js'
//  import Dynamo from '../../../dist/mjs/Dynamo.js'

const client = new Dynamo({
    client: new DynamoDBClient({
        region: 'local', endpoint: 'http://localhost:8000'
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
            gs1:     { hash: 'gs1pk', sort: 'gs1sk', follow: true },
        },
        models: {
            User: {
                pk:          { type: String, value: 'user#${id}' },
                sk:          { type: String, value: 'user#${id}' },
                id:          { type: String, uuid: true },
                name:        { type: String, required: true },
                status:      { type: String, default: 'active' },
                zip:         { type: String },
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

    //  Note: because the ID is auto-generated, this will create a new user each time.
    //  Alternatively, set your own ID and use the 'exists: null' to allow updating.
    let user = await User.create({
        name: 'Peter Smith',
    }, { log: true  })                  //  Emit console trace for the command and result
    console.log('CREATED user', user)

    user = await User.update({id: user.id, status: 'inactive'})
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
