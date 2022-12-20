/*
    single-key.ts - Test table with a single primary key
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {SingleKeySchema} from './schemas'

const table = new Table({
    name: 'SingleKeyTestTable',
    client: Client,
    partial: false,
    schema: SingleKeySchema,
    logger: true,
})

let User
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Describe Table', async () => {
    let info: any = await table.describeTable()
    expect(info.Table).toBeDefined()
    expect(info.Table.TableName).toBe('SingleKeyTestTable')
    expect(info.Table.KeySchema.length).toBe(1)
    expect(info.Table.KeySchema[0].AttributeName).toBe('pkey')
})

test('Create', async () => {
    let properties = {
        name: 'Peter Smith',
        email: 'peter@example.com',
        status: 'active',
    }
    //  Unknown properties must not be written to the table.
    let params = Object.assign({unknown: 42}, properties)
    user = await User.create(params)
    expect(user).toMatchObject(properties)
    expect(user.id).toMatch(Match.ulid)
    expect(user.unknown).toBeUndefined()
    expect(user.pk).toBeUndefined()
    expect(user.sk).toBeUndefined()
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get', async () => {
    user = await User.get({id: user.id}, {hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Find by ID', async () => {
    users = await User.find({id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async () => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item', async () => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async () => {
    user = await User.create({name: 'Sky Blue', status: 'active'})
    users = await User.scan({})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async () => {
    users = await User.scan({})
    expect(users.length).toBe(1)

    for (let user of users) {
        await User.remove({id: user.id})
    }
    users = await User.scan({})
    expect(users.length).toBe(0)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
