/*
    stats.ts - 
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const MaxUsers = 100

const table = new Table({
    name: 'MetricsTestTable',
    client: Client,
    partial: false,
    schema: TenantSchema,
})
let user: any
let users: any[]
const accountId = table.uuid()

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')

test('Create Users', async () => {
    for (let i = 0; i < MaxUsers; i++) {
        await User.create({accountId, name: `User-${i}`, email: `u-${i}@example.com`})
    }
    users = await table.scan('User')
    expect(users.length).toBe(MaxUsers)
})

test('Find with stats', async () => {
    let stats: any = {}
    users = await User.find({accountId}, {stats})
    expect(stats.count).toBe(MaxUsers)
    expect(stats.scanned).toBe(MaxUsers)
    expect(stats.capacity).toBeDefined()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
