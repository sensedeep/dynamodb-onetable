/*
    table-high-level.ts - Test CRUD on table high level API
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'HighLevelTableApiTestTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})

let user: any
let users: any[]

test('Set Client', async () => {
    table.setClient(Client)
    expect(true).toBe(true)
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create', async () => {
    user = await table.create('User', {name: 'Peter Smith', status: 'active'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Get', async () => {
    user = await table.get('User', {id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get including hidden', async () => {
    user = await table.get('User', {id: user.id}, {hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
        sk: 'User#',
        gs1pk: 'User#Peter Smith',
        gs1sk: 'User#',
    })
    expect(user.id).toMatch(Match.ulid)
    expect(user.pk).toMatch(/^User#/)
})

test('Find by ID', async () => {
    users = await table.find('User', {id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by name on GSI', async () => {
    users = await table.find('User', {name: user.name}, {index: 'gs1'})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async () => {
    user = await table.update('User', {id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Remove attribute', async () => {
    //  Remove attribute by setting to null
    user = await table.update('User', {id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async () => {
    //  Update and remove attributes using {remove}
    user = await table.update('User', {id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk'], hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
        sk: 'User#',
    })
    expect(user.gs1pk).toBeUndefined()
    expect(user.gs1sk).toBeUndefined()
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item', async () => {
    await table.remove('User', {id: user.id})
    user = await table.get('User', {id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async () => {
    user = await table.create('User', {name: 'Sky Blue', status: 'active'})
    users = await table.scan('User', {})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async () => {
    users = await table.scan('User', {})
    expect(users.length).toBe(1)

    for (let user of users) {
        await table.remove('User', {id: user.id})
    }
    users = await table.scan('User', {})
    expect(users.length).toBe(0)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
