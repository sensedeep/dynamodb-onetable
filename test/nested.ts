/*
    nested.ts - Test nested schema
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {NestedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'NestedTestTable',
    client: Client,
    schema: NestedSchema,
    logger: true,
})

const Properties = {
    name: 'Peter Smith',
    email: 'peter@example.com',
    status: 'active',
    location: {
        address: '444 Cherry Tree Lane',
        city: 'Seattle',
        zip: '98011',
    },
    balance: 0,
    tokens: ['red', 'white', 'blue']
}

let User = null
let user: any
let users: any[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Get Schema', () => {
    let schema:any = table.getCurrentSchema()
    expect(schema.models).toBeDefined()
    expect(schema.indexes).toBeDefined()
    expect(schema.params).toBeDefined()
    expect(schema.models.User).toBeDefined()
    expect(schema.models.User.pk).toBeDefined()
})

test('Create', async() => {
    //  Unknown properties must not be written to the table
    let properties = Object.assign({unknown: 42, location: {unknown: 42}}, Properties)
    user = await User.create(properties)
    expect(user).toMatchObject(Properties)
    expect(user.id).toMatch(Match.uuid)
    expect(user.balance).toBe(0)
    expect(user.unknown).toBeUndefined()
    expect(user.location).toMatchObject(Properties.location)
    expect(user.location).toBeDefined()
    expect(user.location.unknown).toBeUndefined()
    expect(user.created).toBeUndefined()
    expect(user.updated).toBeUndefined()
    expect(user.pk).toBeUndefined()
    expect(user.sk).toBeUndefined()
})

test('Get', async() => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject(Properties)
})

test('Update top level property', async() => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user.status).toBe('inactive')
    user = await User.update({id: user.id, status: 'active'})
    expect(user).toMatchObject(Properties)

    user = await User.update({id: user.id}, {set: {balance: 10.55}})
    expect(user.balance).toBe(10.55)
    //  Revert
    user = await User.update({id: user.id}, {set: {balance: 0}})
})

test('Update nested property', async() => {
    //  Test native values in set properties
    user = await User.update({id: user.id}, {set: {
        'location.zip': '98012',
        'tokens[1]': 'black',
        balance: 10.55,
        status: 'suspended',
    }})
    expect(user.balance).toBe(10.55)
    expect(user.location.zip).toBe('98012')
    expect(user.tokens).toMatchObject(['red', 'black', 'blue'])
    expect(user.status).toBe('suspended')
})

test('Update nested property via template', async() => {
    //  Test template values in set properties
    user = await User.update({id: user.id}, {set: {
        'location.zip': '{"98011"}',
        'tokens[1]': '{white}',
        status: '{active}',
        balance: 0,
    }})
    expect(user).toMatchObject(Properties)
})

test('Remove top level attribute', async() => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()

    //  Restore status
    user = await User.update({id: user.id, status: 'active'})
    expect(user).toMatchObject(Properties)
})

test('Remove nested attributes', async() => {
    user = await User.update({id: user.id}, {
        remove: ['location.zip', 'tokens[1]'],
    })
    expect(user.location.zip).toBeUndefined()
    expect(user.tokens).toMatchObject(['red', 'blue'])
    user = await User.update({id: user.id}, {set: {'location.zip': '98011'}})
    expect(user.location.zip).toBe('98011')
})

test('Remove item', async() => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
