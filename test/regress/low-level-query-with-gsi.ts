/*
    low-level-query-with-gsi.ts - Regression scenario
 */
import {AWS, Client, Match, Table, print, dump, delay} from '../utils/init'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'RegressLowLevelQueryWithGsiTable',
    client: Client,
    logger: true,
    partial: false,
    schema: {
        format: 'onetable:1.1.0',
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
            emailIndex: {hash: 'email'},
        },
        models: {
            User: {
                pk: {type: String, value: 'user#${email}'},
                sk: {type: String, value: 'user#${email}'},
                id: {type: String, generate: 'ulid'},
                email: {type: String, required: true},
                name: {type: String},
                status: {type: String, default: 'active'},
                zip: {type: String},
            },
        },
        params: {},
    },
})

let User: any

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create', async () => {
    let user = await User.create({email: 'peter@example.com', name: 'Peter Smith'})
    expect(user).toMatchObject({
        email: 'peter@example.com',
        name: 'Peter Smith',
        status: 'active',
    })

    let users: any = await table.queryItems({pk: 'user#peter@example.com'}, {parse: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        email: 'peter@example.com',
        name: 'Peter Smith',
        status: 'active',
    })

    users = await table.queryItems({email: 'peter@example.com'}, {index: 'emailIndex', parse: true})
    expect(users.length).toBe(1)
    expect(user).toMatchObject({
        email: 'peter@example.com',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
