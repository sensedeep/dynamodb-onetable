/*
    Setup -- start dynamodb instance
 */
import DynamoDbLocal from 'dynamo-db-local'

const PORT = 4567

module.exports = async () => {

    let dynamodb = DynamoDbLocal.spawn({port: PORT})
    process.env.DYNAMODB_PID = dynamodb.pid
    process.env.DYNAMODB_PORT = PORT.toString()
    // console.log('Spawn', dynamodb.pid)
}
