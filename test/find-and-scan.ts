/*
    find-and-scan.ts - Basic find and scan options
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'FindScanTable',
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

test('Get with Projection', async() => {
    let nameOnly = await User.get({id: user.id}, {fields: ['name']})
    expect(nameOnly).toEqual({
        name: 'Peter Smith'
    })
})

test('Query with begins', async() => {
    users = await table.scan('User', {}, {hidden: true})
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
