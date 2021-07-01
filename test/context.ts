/*
    context.ts - Test context APIs
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'ContextTestTable',
    client: Client,
    schema: TenantSchema,
    uuid: 'ulid',
    logger: true,
})
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')
let Account = table.getModel('Account')
let account: any
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com' },
    {name: 'Patty O\'Furniture', email: 'patty@example.com' },
    {name: 'Cu Later', email: 'cu@example.com' },
]

test('Create Account', async() => {
    account = await Account.create({name: 'Acme'})
    expect(account.name).toBe('Acme')
    expect(account.id).toMatch(Match.ulid)
    expect(account._type).toBe('Account')
})

test('Set Context', async() => {
    table.setContext({accountId: account.id})
})

test('Create Users', async() => {
    for (let item of data) {
        //  Account ID comes from context
        user = await User.create(item)
        expect(user).toMatchObject(item)
        expect(user.id).toMatch(Match.ulid)
        expect(user.accountId).toBe(account.id)
    }
    users = await User.scan()
    expect(users.length).toBe(data.length)
})

test('Get Users', async() => {
    //  PK comes from context
    users = await User.find()
    expect(users.length).toBe(data.length)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
