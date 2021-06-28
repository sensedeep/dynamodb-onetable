/*
   low-level-table-api.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'LowLevelTableApi',
    client: Client,
    schema: DefaultSchema,
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')
let user: any
let users: any[]

test('Create User', async() => {
    user = await User.create({name: 'Peter Smith', status: 'active'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('ScanItems with filter', async() => {
    users = await table.scanItems({_type: 'User'}, {parse: true, hidden: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
    expect(user.pk).toBe(`user#${user.id}`)
    expect(user.sk).toBe('user#')
    expect(user.gs1pk).toBe('user#Peter Smith')
    expect(user.gs1sk).toBe('user#')
})

test('QueryItems with begins', async() => {
    users = await table.queryItems({pk: `user#${user.id}`, sk: {begins: 'use'}}, {hidden: true, parse: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.created).toEqual(expect.any(Date))
    expect(user.updated).toEqual(expect.any(Date))
    expect(user.id).toMatch(Match.uuid)
    expect(user.pk).toBe(`user#${user.id}`)
    expect(user.sk).toBe('user#')
    expect(user.gs1pk).toBe('user#Peter Smith')
    expect(user.gs1sk).toBe('user#')
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
