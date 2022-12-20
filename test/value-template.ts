/*
    value-function.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'

const table = new Table({
    name: 'ValueFunctionTestTable',
    client: Client,
    logger: true,
    partial: false,
    schema: {
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
        },
        models: {
            User: {
                pk: {type: String, value: 'user#${email}'},
                sk: {
                    type: String,
                    value: 'user#${email}',
                },
                id: {type: String, generate: 'ulid'},
                email: {type: String, required: true},
                name: {type: String},
            },
        },
    },
    timestamps: true,
})

let User

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
        User = table.getModel('User')
    }
})

test('Test value template', async () => {
    let user = await User.create({email: 'peter@example.com', name: 'Peter Smith'})
    expect(user).toMatchObject({
        email: 'peter@example.com',
        name: 'Peter Smith',
    })
    user = await User.get({email: 'peter@example.com'})
    expect(user).toMatchObject({email: 'peter@example.com'})
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
