/*
    metric.ts - Metrics test
 */
import {Client, Table, print, dump} from './utils/init'

// jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    params: {
        createdField: 'createdAt',
        updatedField: 'updatedAt',
        isoDates: true,
        timestamps: true,
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${email}'},
            sk: {type: String, value: '${_type}#'},
            email: {type: String, required: true},
            balance: {type: Number, default: 0},
        },
    } as const,
}

const table = new Table({
    name: 'MetricTable',
    client: Client,
    partial: true,
    schema,
    logger: true,
    metrics: {custom: true, env: false},
})

//  This will create a local table
test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

//  TODO - need many more tests
test('Test Metrics', async () => {
    let User = table.getModel('User')
    let user = await User.create({email: 'user@example.com'})
    expect(user).toBeDefined()
    expect(user.email).toBe('user@example.com')

    await table.flushMetrics()

    user = await User.update({email: user.email}, {set: {balance: '${balance} + {10.55}'}})
    await table.flushMetrics()

    let users = await User.find({email: user.email}, {profile: 'find-user-by-email'})
    expect(users.length).toBe(1)
    await table.flushMetrics()
})

test('Test terminate()', async () => {
    await Table.terminate()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
