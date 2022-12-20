/*
    SenseDeep logging database access
 */

import DynamoDB from 'aws-sdk/clients/dynamodb.js'
import {Table} from 'dynamodb-onetable'
import Schema from './schema.js'

const client = new DynamoDB.DocumentClient({
    //  Configure your credentials here or define AWS_PROFILE.
    region: 'us-east-1',
})

/*
    Single-table schema and setup. This is used for general access and by `createTable`
 */
const table = new Table({
    client,
    name: `SenseDeep`,
    schema: Schema,
})

const Log = table.getModel('Log')
const Event = table.getModel('Event')

async function main() {
    let logs = await Log.find()
    console.log('Logs', JSON.stringify(logs, null, 4))

    /*
        Retrieve log events for /aws/lambda/HelloWorld between Jun 10 and July 10 2021
        Note: sort keys values are of the form: `${IsoDate}:${eventId}.
    */
    let events = await Event.find(
        {
            pk: '/aws/lambda/HelloWorld',
            sk: {between: ['2021-06-10T00:00:00.000Z', '2021-07-10T00:00:00.000Z']},
        },
        {limit: 100}
    )
    console.log('Events', JSON.stringify(events, null, 4))

    /*
        Get the most recent 10 events, most recent first
     */
    events = await Event.find(
        {
            pk: '/aws/lambda/HelloWorld',
            sk: {between: ['2021', new Date().toISOString()]},
        },
        {limit: 10, reverse: true}
    )
    console.log('Most recent Events', JSON.stringify(events, null, 4))
}

main()
