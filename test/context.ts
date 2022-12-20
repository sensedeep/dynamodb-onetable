/*
    context.ts - Test context APIs
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {TenantSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'ContextTestTable',
    client: Client,
    partial: false,
    schema: TenantSchema,
    logger: true,
})
const accountId = table.uuid()

test('Create table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof TenantSchema.models.User>
let User = table.getModel('User')
let Account = table.getModel('Account')
let account: any
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com'},
    {name: "Patty O'Furniture", email: 'patty@example.com'},
    {name: 'Cu Later', email: 'cu@example.com'},
]

test('Create account', async () => {
    account = await Account.create({name: 'Acme'})
    expect(account.name).toBe('Acme')
    expect(account.id).toMatch(Match.ulid)
})

test('Set context', async () => {
    table.setContext({accountId: account.id})
    let context: any = table.getContext()
    expect(context).toMatchObject({accountId: account.id})

    //  Merge new values
    table.setContext({color: 'blue'}, true)
    context = table.getContext()
    expect(context).toMatchObject({accountId: account.id, color: 'blue'})

    //  Revert
    table.setContext({accountId: account.id})
    context = table.getContext()
    expect(context).toMatchObject({accountId: account.id})
})

test('Add context', async () => {
    table.setContext({accountId: account.id})
    let context: any = table.getContext()
    expect(context).toMatchObject({accountId: account.id})

    table.addContext({color: 'blue'})
    context = table.getContext()
    expect(context).toMatchObject({accountId: account.id, color: 'blue'})

    //  Revert
    table.setContext({accountId: account.id})
    context = table.getContext()
    expect(context).toMatchObject({accountId: account.id})
})

test('Create users', async () => {
    for (let item of data) {
        //  Account ID comes from context
        user = await User.create(item)
        expect(user).toMatchObject(item)
        expect(user.id).toMatch(Match.ulid)
        expect(user.accountId).toBe(account.id)
    }
    users = await User.scan()
    expect(users.length).toBe(data.length)

    let collection: any = await table.fetch(['Account', 'User'], {pk: `Account#${account.id}`})
    expect(collection.Account.length).toBe(1)
    expect(collection.User.length).toBe(data.length)
})

test('Get users', async () => {
    //  PK comes from context
    users = await User.find()
    expect(users.length).toBe(data.length)

    expect(async () => {
        //  Must provide sort key for a get
        user = await User.get({accountId: account.id})
    }).rejects.toThrow()
})

test('Get single user', async () => {
    //  PK comes from context
    user = await User.get({email: 'peter@example.com'})
    expect(user.email).toBe('peter@example.com')

    expect(async () => {
        //  Should throw due to matching more than one user
        user = await User.get({})
    }).rejects.toThrow()
})

test('Remove many users (returning ALL_OLD)', async () => {
    //  PK comes from context
    let removed: any = await User.remove({}, {many: true})
    expect(removed).toHaveLength(3)
    if (removed) {
        expect(removed[0].email).toEqual('peter@example.com')
        expect(removed[1].email).toEqual('patty@example.com')
        expect(removed[2].email).toEqual('cu@example.com')
    }
    users = await User.scan()
    expect(users.length).toBe(0)
})

test('Clear context', async () => {
    //  PK comes from context
    let context = table.getContext()
    expect(context).toMatchObject({accountId: account.id})

    table.clearContext()
    context = table.getContext()
    expect(context).toMatchObject({})
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
