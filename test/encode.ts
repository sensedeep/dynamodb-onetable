/*
    basic.ts - Basic create / get
 */
import {AWS, Client, Table, print, dump} from './utils/init'

jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    params: {
        separator: '#',
    },
    models: {
        User: {
            pk: { type: 'string', value: '${_type}#${id}'},
            sk: { type: 'string', value: '${_type}#${email}' },
            id: {type: String, generate: 'ulid'},
            email: { type: 'string', encode: 'sk' },
        }
    } as const,
}

const table = new Table({
    name: 'EncodeTable',
    client: Client,
    partial: true,
    schema,
    logger: true,
})

//  This will create a local table
test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Test Encode', async () => {
    let User = table.getModel('User')
    let user = await User.create({
        email: "user@example.com",
    })
    expect(user).toBeDefined()
    expect(user.email).toBe('user@example.com')
    
    let u2 = await User.get({email: user.email, id: user.id})
    expect(u2).toBeDefined()
    expect(u2?.email).toBe('user@example.com')

    let users = await User.find({email: user.email, id: user.id})
    expect(users.length).toBe(1)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
