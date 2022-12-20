/*
    find-and-scan.ts - Basic find and scan options
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'FindTable',
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
let users: any

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active'},
    {name: "Patty O'Furniture", email: 'patty@example.com', status: 'active'},
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive'},
]

test('Create Users', async () => {
    for (let item of data) {
        await User.create(item)
    }
    //  This will do a query with 'begins:#user'
    users = await User.find({}, {index: 'gs2'})
    expect(users.length).toBe(data.length)
})

test('Find with filter', async () => {
    users = await User.find({status: 'active'}, {index: 'gs2'})
    expect(users.length).toBe(data.filter((i) => i.status == 'active').length)
})

test('Find with Projection', async () => {
    let nameOnly = await User.find({name: data[0].name}, {index: 'gs1', fields: ['name']})
    expect(nameOnly.length).toBe(1)
    expect(Object.keys(nameOnly[0])).toEqual(['name'])
})

test('Find count of items', async () => {
    users = await User.scan({}, {count: true})
    expect(users.count).toBe(3)
})

test('Find count via select', async () => {
    users = await User.scan({}, {select: 'COUNT'})
    expect(users.count).toBe(3)
})

test('Find select with project', async () => {
    expect(async () => {
        //  Cannot do select and fields
        users = await User.scan({}, {select: 'COUNT', fields: ['email']})
    }).rejects.toThrow()

    expect(async () => {
        //  Cannot do count and fields
        users = await User.scan({}, {count: true, fields: ['email']})
    }).rejects.toThrow()
})

test('Find with where clause', async () => {
    let items = await User.find(
        {},
        {
            where: '(${status} = {active}) and (${email} = @{email} and ${name} <> {Unknown})',
            index: 'gs2',
            substitutions: {
                email: 'peter@example.com',
            },
        }
    )
    expect(items.length).toBe(1)
})

test('List with begins_with', async () => {
    let items = await User.find(
        {
            status: 'active',
            gs3sk: {begins_with: 'User#Pa'},
        },
        {
            index: 'gs3',
        }
    )
    expect(items.length).toBe(1)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Find count of large set of items', async () => {
    const USER_COUNT = 80
    await table.createTable()
    expect(await table.exists()).toBe(true)

    for (let i = 0; i < USER_COUNT; ++i) {
        await User.create({
            name: `Peter ${i} Smith`,
            email: `peter.${i}@example.com`,
            status: 'active',
            age: i,
            profile: Array(26) // Creates a really large object with 256 char keys/values
                .fill(0)
                .map((x, i) => ''.padStart(256, String.fromCharCode(i + 65)))
                .reduce((out, val) => {
                    out[val] = val
                    return out
                }, {}),
        })
    }

    users = await User.find({status: 'active'}, {index: 'gs2', count: true})
    expect(users.count).toBe(USER_COUNT)

    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
}, 300_000)
