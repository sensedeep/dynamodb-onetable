/*
    crud.ts - Basic create, read, update delete
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'CrudTestTable',
    client: Client,
    schema: DefaultSchema,
})

let User = null
let user: any
let users: any[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Validate User model', () => {
    User = table.getModel('User')
    expect(User).toMatchObject({
        name: 'User',
        hash: 'pk',
        sort: 'sk',
    })
})

test('Create', async() => {
    user = await User.create({name: 'Peter Smith', status: 'active'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Get', async() => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
})

test('Get including hidden', async() => {
    user = await User.get({id: user.id}, {hidden: true})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        sk: 'user#',
        gs1pk: 'user#Peter Smith',
        gs1sk: 'user#',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
    expect(user.pk).toMatch(/^user#/)
})

test('Find by ID', async() => {
    users = await User.find({id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by name on GSI', async() => {
    users = await User.find({name: user.name}, {index: 'gs1'})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async() => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
})

test('Remove attribute', async() => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async() => {
    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk'], hidden: true})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        sk: 'user#',
    })
    expect(user.gs1pk).toBeUndefined()
    expect(user.gs1sk).toBeUndefined()
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
})

test('Remove item', async() => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async() => {
    user = await User.create({name: 'Sky Blue', status: 'active'})
    users = await User.scan({})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async() => {
    users = await User.scan({})
    expect(users.length).toBe(1)

    for (let user of users) {
        await User.remove({id: user.id})
    }
    users = await User.scan({})
    expect(users.length).toBe(0)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
