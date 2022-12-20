/*
    find-and-scan.ts - Basic find and scan options
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'ScanTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active'},
    {name: "Patty O'Furniture", email: 'patty@example.com', status: 'active'},
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive'},
]

test('Create Users', async () => {
    for (let item of data) {
        await User.create(item)
    }
    users = await table.scan('User')
    expect(users.length).toBe(data.length)
})

test('Scan revealing hidden', async () => {
    users = await table.scan('User', {}, {hidden: true})
    expect(users.length).toBe(data.length)
    for (let user of users) {
        let item = data.find((i) => i.name == user.name)
        expect(item).toBeDefined()
        if (item) {
            expect(user).toMatchObject({
                _type: 'User',
                name: item.name,
                status: item.status,
            })
        }
        expect(user.id).toMatch(Match.ulid)
        expect(user.pk).toBe(`User#${user.id}`)
        expect(user.sk).toBe('User#')
        expect(user.gs1pk).toBe(`User#${item ? item.name : ''}`)
        expect(user.gs1sk).toBe('User#')
    }
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
