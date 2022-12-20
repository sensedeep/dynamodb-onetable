/*
    mock.ts - Used to mock scenarios
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'MockTable',
    client: Client,
    logger: true,
    partial: false,
    schema: {
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

test('Create', async () => {})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
