/*
    Demonstrate property packing in a single attribute

    Userful to have a single "data" attribute in a GSI that can store multiple properties.
    This is because you can't change the GSI "projects" list after the GSI is created.
    This works around that limitation.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { Table } from 'dynamodb-onetable'

//  For AWS V3
import Dynamo from 'dynamodb-onetable/Dynamo'

//  To debug locally
// import { Table } from '../../../dist/mjs/index.js'
// import Dynamo from '../../../dist/mjs/Dynamo.js'

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
            gs1:     { hash: 'gs1pk', sort: 'gs1sk', project: ['gs1pk', 'gs1sk', 'data'] },
        },
        models: {
            User: {
                pk:          { type: String, value: 'user#${id}' },
                sk:          { type: String, value: 'user#' },
                id:          { type: String, uuid: true },
                name:        { type: String },

                //  Properties packed into the "data" attribute projected to the gs1 secondary index
                address:     { type: String, map: 'data.address' },
                city:        { type: String, map: 'data.city' },
                zip:         { type: String, map: 'data.zip' },

                gs1pk:       { type: String, value: 'user#${name}' },
                gs1sk:       { type: String, value: 'user#' },
            }
        }
    }
})

//  Create a model to manage User entities
const User = table.getModel('User')

async function main() {

    if (!(await table.exists())) {
        await table.createTable()
    }

    /*
        The address, city and zip properties are packed into the single 'data' attribute.
        All packed properties must be provided.
    */
    let user = await User.create({
        name: 'Peter Smith',
        zip: 98011,
        address: '444 Cherry Tree Lane',
        city: 'Seattle',
    }, { log: true })                  //  Emit console trace for the command and result

    console.log('CREATED user', JSON.stringify(user, null, 4))

    user = await User.get({id: user.id})
    console.log('Simple get user by ID', JSON.stringify(user, null, 4))

    //  Without follow will fetch just the GSI data
    let data = await User.find({name: 'Peter Smith'}, {index: 'gs1'})
    console.log('Fetch user via GSI without follow', JSON.stringify(data, null, 4))

    //  With follow, will follow the GSI and fetch the entire user
    user = await User.find({name: 'Peter Smith'}, {index: 'gs1', follow: true})
    console.log('Fetch user via GSI with follow', JSON.stringify(user, null, 4))

    //  Cleanup. The argument is a safety string
    await table.deleteTable('DeleteTableForever')
}

main()
