/*
    Simple CRUD with OneTable
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import Dynamo from 'dynamodb-onetable/Dynamo'
// import { Table } from 'dynamodb-onetable'
import { Table } from '../../../dist/mjs/index.js'

const client = new Dynamo({
    client: new DynamoDBClient({
        region: 'local', endpoint: 'http://localhost:8000'
    })
})

const table = new Table({
    name: 'TestCrud',
    client: client,
    uuid: 'ulid',
    delimiter: '#',
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
    logger: (type, message, context) => {
        if (type == 'trace' || type == 'data') return
        console.log(type, message, JSON.stringify(context, null, 4))
    }
})

const User = table.getModel('User')

async function main() {
    let user = await User.create({
        name: 'Peter Smith',
    }, { log: true  })                  //  Emit console trace
    console.log('CREATE', user)

    user = await User.update({id: user.id, status: 'inactive'})
    console.log('UPDATED', user)

    //  Scan is not normally advised -- scans entire table
    let users = await User.scan({})

    console.log('FIND', users)

    for (let user of users) {
        await User.remove({id: user.id})
    }
}

main()
