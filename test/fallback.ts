/*
    fallback.ts - Enhanced get/remove via fallback
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'FallbackTestTable',
    client: Client,
    partial: false,
    schema: TenantSchema,
})
const accountId = table.uuid()

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
    {accountId, name: 'Peter Smith', email: 'peter@example.com'},
    {accountId, name: "Patty O'Furniture", email: 'patty@example.com'},
    {accountId, name: 'Cu Later', email: 'cu@example.com'},
]

test('Create Users', async () => {
    for (let item of data) {
        item.accountId = accountId
        await User.create(item)
    }
    users = await User.scan()
    expect(users.length).toBe(data.length)
})

test('Get with fallback', async () => {
    //  Use gs1 to query via email. This will do a find, then a get.
    user = await User.get({accountId, email: 'patty@example.com'}, {index: 'gs1'})
    expect(user.name).toBe("Patty O'Furniture")
})

test('Remove with fallback', async () => {
    //  Use gs1 to query via email. This will do a find, then a get.
    await User.remove({email: 'patty@example.com'}, {index: 'gs1'})
    user = await User.get({email: 'patty@example.com'}, {index: 'gs1'})
    expect(user).toBeUndefined()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
