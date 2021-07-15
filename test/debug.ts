/*
    fallback.ts - Enhanced get/remove via fallback
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTable',
    client: Client,
    schema: TenantSchema,
    uuid: 'ulid',
})
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof TenantSchema.models.User>
let User = table.getModel<UserType>('User')
let user: UserType = null

type AccountType = Entity<typeof TenantSchema.models.Account>
let Account = table.getModel<AccountType>('Account')
let account: AccountType = null

let userData = [
    {accountId: null, name: 'Peter Smith', email: 'peter@example.com' },
    {accountId: null, name: 'Patty O\'Furniture', email: 'patty@example.com' },
    {accountId: null, name: 'Cu Later', email: 'cu@example.com' },
]

test('Scenario 1', async() => {
    account = await Account.create({name: 'Acme Rockets'})
    table.setContext({accountId: account.id})
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
