/*
    typescript-count.ts - Test *count methods
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'TypescriptCountTestTable',
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

type UserType = Entity<typeof TenantSchema.models.User>
let User = table.getModel('User')
let user: UserType

type AccountType = Entity<typeof TenantSchema.models.Account>
let Account = table.getModel('Account')
let account: AccountType

let userData = [
    {accountId: '', name: 'Peter Smith', email: 'peter@example.com'},
    {accountId: '', name: "Patty O'Furniture", email: 'patty@example.com'},
    {accountId: '', name: 'Cu Later', email: 'cu@example.com'},
]

test('Create Account and Users', async () => {
    account = await Account.create({name: 'Acme Rockets'})
    expect(account).toMatchObject({name: 'Acme Rockets'})

    table.setContext({accountId: account.id})
    expect(table.getContext()).toMatchObject({accountId: account.id})

    for (let item of userData) {
        item.accountId = accountId
        await User.create(item)
    }
    let users = await User.scan()
    expect(users.length).toBe(userData.length)
})

test('FindCount', async () => {
    let count = true
    let num = (await table.find('User', {}, {count})).count
    expect(num).toBe(userData.length)

    num = (await table.scan('User', {}, {count})).count
    expect(num).toBe(userData.length)

    num = (await table.scan('Account', {}, {count})).count
    expect(num).toBe(1)

    //  Returns 3 users, 1 account and 1 unique entry
    num = (await table.scanItems({}, {count})).count
    expect(num).toBe(userData.length + 2)

    num = (await table.queryItems({pk: `Account#${account.id}`}, {count})).count
    expect(num).toBe(userData.length + 1)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
