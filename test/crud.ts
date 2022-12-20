/*
    crud.ts - Basic create, read, update delete
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'CrudTestTable',
    client: Client,
    schema: DefaultSchema,
    partial: false,
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
})

test('Get Schema', () => {
    let schema: any = table.getCurrentSchema()
    expect(schema.models).toBeDefined()
    expect(schema.indexes).toBeDefined()
    expect(schema.params).toBeDefined()
    expect(schema.models.User).toBeDefined()
    expect(schema.models.User.pk).toBeDefined()
})

test('Describe Table', async () => {
    let info: any = await table.describeTable()
    expect(info.Table).toBeDefined()
    expect(info.Table.TableName).toBe('CrudTestTable')
})

test('Validate User model', async () => {
    await expect(async () => {
        // @ts-expect-error
        User = table.getModel('Unknown')
    }).rejects.toThrow()

    User = table.getModel('User')
    expect(User).toMatchObject({
        name: 'User',
        hash: 'pk',
        sort: 'sk',
    })
})

test('Create', async () => {
    let now = new Date()
    let properties = {
        name: 'Peter Smith',
        email: 'peter@example.com',
        profile: {
            avatar: 'eagle',
        },
        status: 'active',
        age: 42,
        registered: now,
    }
    //  Unknown properties must not be written to the table. Note: the profile object is schemaless.
    let params = Object.assign({unknown: 99}, properties)
    user = await User.create(params)
    expect(user).toMatchObject(properties)
    expect(user.id).toMatch(Match.ulid)
    expect(user.profile).toBeDefined()
    expect(user.profile.avatar).toBe('eagle')
    expect(user.unknown).toBeUndefined()
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.age).toBe(42)
    expect(user.registered.toString()).toBe(now.toString())
    expect(user.pk).toBeUndefined()
    expect(user.sk).toBeUndefined()
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Get including hidden', async () => {
    user = await User.get({id: user.id}, {hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
        sk: 'User#',
        gs1pk: 'User#Peter Smith',
        gs1sk: 'User#',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
    expect(user.pk).toMatch(/^User#/)
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

test('Find by name on GSI', async () => {
    users = await User.find({name: user.name}, {index: 'gs1'})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async () => {
    user = await User.update({id: user.id, status: 'inactive', age: 99})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'inactive',
        age: 99,
    })
    expect(user.age).toBe(99)
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Remove attribute', async () => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async () => {
    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk'], hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
        sk: 'User#',
    })
    expect(user.gs1pk).toBeUndefined()
    expect(user.gs1sk).toBeUndefined()
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item (returning ALL_OLD)', async () => {
    user = await User.get({id: user.id})
    const removed = await User.remove({id: user.id})
    expect(removed).toEqual(user)

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
