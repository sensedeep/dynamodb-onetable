import DynamoDbLocal from 'dynamo-db-local'

module.exports = async () => {
    let pid = parseInt(process.env.DYNAMODB_PID)
    // console.log('KILL', pid)
    if (pid) {
        process.kill(pid)
    }
}
