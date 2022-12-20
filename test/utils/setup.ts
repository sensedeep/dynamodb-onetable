/*
    Setup -- start dynamodb instance
 */
import {spawn} from 'child_process'
const waitPort = require('wait-port')
import DynamoDbLocal from 'dynamo-db-local'

const PORT = parseInt(process.env.PORT || '4567')
const USE_DOCKER = Boolean(process.env.DOCKER)

module.exports = async () => {
    let dynamodb

    // Run docker for any truthy DOCKER value
    if (USE_DOCKER) {
        const args = [`run`, `-p`, `${PORT}:8000`, `amazon/dynamodb-local`]
        console.info('\nUsing docker to run dynamoDB', {
            args,
        })

        // Docker errors will be forwarded to the local terminal with stdio: inherit
        dynamodb = spawn(`docker`, args, {
            cwd: __dirname,
            stdio: 'inherit',
        })
    } else {
        console.info('Using local Java to run dynamoDB')
        dynamodb = DynamoDbLocal.spawn({port: PORT, stdio: 'inherit'})
    }

    console.info('Spawn DynamoDB', dynamodb.pid)

    await waitPort({
        host: '0.0.0.0',
        port: PORT,
        timeout: 10000,
    })

    console.info('DynamoDB is ready')

    process.env.DYNAMODB_PID = String(dynamodb.pid)
    process.env.DYNAMODB_PORT = String(PORT)

    // When jest throws anything unhandled, ensure we kill the spawned process
    process.on('unhandledRejection', (error) => {
        let pid = parseInt(process.env.DYNAMODB_PID || '')
        if (pid) {
            process.kill(pid)
        }
    })
}
