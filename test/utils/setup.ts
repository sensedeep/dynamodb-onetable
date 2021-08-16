/*
    Setup -- start dynamodb instance
 */
import { spawn } from 'child_process'
import DynamoDbLocal from 'dynamo-db-local'

const PORT = 4567

module.exports = async () => {
    let dynamodb

    if (String(process.env.DOCKER) === 'true') {
        const args = [`run`, `-p`, `${PORT}:8000`, `amazon/dynamodb-local`]
        console.info('Using docker to run dynamoDB', {
            args,
        })

        // Docker errors will be forwarded to the local terminal with
        // stdio: inherit
        dynamodb = spawn(`docker`, args, {
            cwd: __dirname,
            stdio: 'inherit',
        })
    } else {
        console.info('Using local Java to run dynamoDB')
        dynamodb = DynamoDbLocal.spawn({ port: PORT })
    }

    process.env.DYNAMODB_PID = String(dynamodb.pid)
    process.env.DYNAMODB_PORT = String(PORT)

    // When jest throws anything unhandled, ensure we kill the spawned process
    process.on('unhandledRejection', (error) => {
        let pid = parseInt(process.env.DYNAMODB_PID)
        if (pid) {
            process.kill(pid)
        }
    })

    console.info('Spawn DynamoDB', dynamodb.pid)
}
