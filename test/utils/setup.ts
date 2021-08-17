/*
    Setup -- start dynamodb instance
 */
import { spawn } from 'child_process'
const waitPort = require('wait-port')
import DynamoDbLocal from 'dynamo-db-local'

const PORT = 4567
const DYNAMODB_DOCKER_PORT = parseInt(process.env.DYNAMODB_DOCKER_PORT)

module.exports = async () => {
    let dynamodb

    if (DYNAMODB_DOCKER_PORT) {
        const args = [
            `run`,
            `-p`,
            `${DYNAMODB_DOCKER_PORT}:8000`,
            `amazon/dynamodb-local`,
        ]
        console.info('\nUsing docker to run dynamoDB', {
            args,
        })

        // Docker errors will be forwarded to the local terminal with
        // stdio: inherit
        dynamodb = spawn(`docker`, args, {
            cwd: __dirname,
            stdio: 'inherit',
        })

        await waitPort({
            host: '0.0.0.0',
            port: DYNAMODB_DOCKER_PORT,
            timeout: 3000,
        })

        console.info('Docker is ready')
    } else {
        console.info('Using local Java to run dynamoDB')
        dynamodb = DynamoDbLocal.spawn({ port: PORT })
    }

    process.env.DYNAMODB_PID = String(dynamodb.pid)
    process.env.DYNAMODB_PORT = String(DYNAMODB_DOCKER_PORT || PORT)

    // When jest throws anything unhandled, ensure we kill the spawned process
    process.on('unhandledRejection', (error) => {
        let pid = parseInt(process.env.DYNAMODB_PID)
        if (pid) {
            process.kill(pid)
        }
    })

    console.info('Spawn DynamoDB', dynamodb.pid)
}
