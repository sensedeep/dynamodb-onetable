/*
    Migrate.js -- Database migration orchestration

    This hosts the onetable-migrate library backend service for use by the CLI
*/
//  For AWS V2
import DynamoDB from 'aws-sdk/clients/dynamodb'

//  For AWS V3
//  import Dynamo from 'dynamodb-onetable/Dynamo'

// import {Table} from 'dynamodb-onetable'
// import {Migrate} from 'onetable-migrate'

//  To debug locally
import {Table} from '../../dist/mjs/index.js'
import {Migrate} from './node_modules/onetable-migrate/dist/mjs/index.js'

import Schema from './migrations/Schema'
import {Migrations} from './migrations'

/*
    Configuration for Table()
*/
const Config = {
    name: 'onetable-migrate',
    logger: true,
    schema: Schema,
    migrations: Migrations,
}

/*
    Lamba entry point
 */
exports.handler = async (event, context) => {

    let {action, args, config} = event

    /*
        Get a connection to the DynamoDB in this region. (AWS SDK V2)
        AWS SDK V3 code to create a client connection to DynamoDB:
        const client = new Dynamo({client: new DynamoDBClient({})})
    */
    Config.client = new DynamoDB.DocumentClient({
        //  Remove when running in a real region
        endpoint: `http://localhost:8000`,
        region: 'local',
    })

    /*
        Create the OneTable connection
    */
    let onetable = new Table(Config)

    let migrate = new Migrate(onetable, Config)

    console.log(`Migrate proxy "${action}"`)

    let data
    switch (action) {
    case 'apply':
        let {direction, version} = args
        data = await migrate.apply(direction, version)
        break

    case 'getCurrentVersion':
        data = await migrate.getCurrentVersion()
        break

    case 'findPastMigrations':
        data = await migrate.findPastMigrations()
        break

    case 'getOutstandingVersions':
        data = await migrate.getOutstandingVersions()
        break

    default:
        throw new Error(`Unknown migration action ${action}`)
    }

    return {
        body: data,
        statusCode: 200,
    }
}
