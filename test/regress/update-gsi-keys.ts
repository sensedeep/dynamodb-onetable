/*
    update-gsi-keys.ts - Test updating GSI keys
 */
import {AWS, Client, Entity, Model, Table, print, dump, delay} from '../utils/init'

const schema = {
    format: 'onetable:1.1.0',
    version: '0.1.0',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: 'User#${email}'},
            sk: {type: String, value: 'User#'},
            gs1pk: {type: String, value: 'Name#${name}'},
            email: {type: String},
            name: {type: String},
        },
    },
    params: {},
}

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'regress-1',
    client: Client,
    partial: false,
    schema,
    nulls: false,
    isoDates: true,
    logger: true,
    timestamps: false,
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User
let user: any
let users: any[]

test('Test', async () => {
    let id = table.uuid()
    User = table.getModel('User')

    //  Create user
    let user: any = await User.create({email: 'peter@example.com', name: 'peter'})
    expect(user.email).toBe('peter@example.com')
    expect(user.name).toBe('peter')

    user = await User.update({email: 'peter@example.com', name: 'john'}, {exists: null})
    expect(user.name).toBe('john')

    user = await User.get({email: 'peter@example.com'})
    expect(user.name).toBe('john')

    user = await User.get({name: 'john'}, {index: 'gs1'})
    expect(user.name).toBe('john')

    user = await User.get({name: 'peter'}, {index: 'gs1'})
    expect(user).toBe(undefined)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
