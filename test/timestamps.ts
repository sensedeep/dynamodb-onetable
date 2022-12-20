/*
    timestamps.ts - Basic operations with timestamps
 */
import {Client, Table} from './utils/init'

const table = new Table({
    name: 'TimestampsTable',
    client: Client,
    partial: false,
    schema: {
        version: '0.0.1',
        indexes: {
            primary: {hash: 'pk', sort: 'sk'},
        },
        models: {
            User: {
                pk: {type: String, value: '${_type}#${id}'},
                sk: {type: String, value: '${_type}#'},
                id: {type: String, generate: 'ulid'},
                name: {type: String},
                email: {type: String},
            },
        },
        params: {
            timestamps: true,
            createdField: 'createdAt',
            updatedField: 'updatedAt',
        },
    },
})

let User
let user: any

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Creates record with timestamps', async () => {
    let properties = {
        name: 'Peter Smith',
        email: 'peter@example.com',
    }
    user = await User.create(properties)
    expect(user.createdAt).toBeDefined()
    expect(user.updatedAt).toBeDefined()
})

test('Updates using set and exists: null should not be overwritten by timestamps set', async () => {
    const {id, createdAt, updatedAt} = user
    user = await User.update({id}, {exists: null, set: {name: 'Marcelo'}})
    expect(user.name).toEqual('Marcelo')
    expect(user.createdAt).toEqual(createdAt)
    expect(user.updatedAt.getTime()).toBeGreaterThan(updatedAt.getTime())
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
