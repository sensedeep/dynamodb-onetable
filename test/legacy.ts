/*
    legacy-data.ts - Access non-onetable data in legacy tables
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'LegacyTestTable',
    client: Client,
    partial: false,
    schema: {
        version: '0.0.1',
        indexes: {
            primary: {hash: 'name'},
        },
        models: {
            Legacy: {
                name: {type: String},
                email: {type: String},
            },
        },
    },
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let user: any
let users: any[]

test('Put item', async () => {
    user = await table.putItem(
        {
            name: 'Peter Smith',
            email: 'peter@example.com',
        },
        {parse: true}
    )
    expect(user.name).toBe('Peter Smith')
    expect(user.email).toBe('peter@example.com')
})

test('Scan Items', async () => {
    users = await table.scanItems({}, {parse: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user.name).toBe('Peter Smith')
    expect(user.email).toBe('peter@example.com')
})

test('Query Items', async () => {
    users = await table.queryItems({name: 'Peter Smith'}, {parse: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user.name).toBe('Peter Smith')
    expect(user.email).toBe('peter@example.com')
})

test('Update Items', async () => {
    user = await table.updateItem({name: 'Peter Smith', email: 'peter@gmail.com'}, {parse: true})
    expect(user.email).toBe('peter@gmail.com')
    expect(user.name).toBe('Peter Smith')
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
