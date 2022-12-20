/*
    params.ts - Test API params

    Initially just doing add/delete/remove/set
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {NestedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'ParamsTestTable',
    client: Client,
    partial: false,
    logger: true,
    schema: NestedSchema,
    timestamps: true,
})

const Properties = {
    name: 'Peter Smith',
    email: 'peter@example.com',
    status: 'active',
    balance: 10,
    location: {
        address: '444 Cherry Tree Lane',
        city: 'Seattle',
        zip: '98011',
    },
    tokens: ['red', 'white', 'blue'],
}

let User
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create', async () => {
    user = await User.create(Properties)
    expect(user).toMatchObject(Properties)

    user = await User.get({id: user.id})
    expect(user).toMatchObject(Properties)
    expect(user.balance).toBe(10)
    expect(user.tokens.length).toBe(3)
})

test('Create via update', async () => {
    await User.remove(user)
    users = await User.scan()
    let props = Object.assign({id: table.uuid()}, Properties)
    user = await User.update(props, {exists: null})
    expect(user).toMatchObject(Properties)
})

test('Add', async () => {
    user = await User.update({id: user.id}, {add: {balance: 1}})
    expect(user.balance).toBe(11)

    user = await User.update({id: user.id}, {add: {balance: -4}})
    expect(user.balance).toBe(7)
})

/* TODO
test('Delete', async () => {
    user = await User.update({id: user.id}, {delete: {tokens: 'red'}})
    expect(user.tokens.length).toBe(1)
    expect(user.tokens).toBe(['blue'])
}) */

test('Set native', async () => {
    //  Test native values in set properties
    user = await User.update(
        {id: user.id},
        {
            set: {
                'location.zip': 98012,
                status: 'suspended',
            },
        }
    )
    expect(user.location.zip).toBe(98012)
    expect(user.status).toBe('suspended')
})

test('Set template', async () => {
    //  Test template values in set properties
    user = await User.update(
        {id: user.id},
        {
            set: {
                'location.zip': '{98011}',
                status: '{active}',
            },
        }
    )
    expect(user.location.zip).toBe(98011)
    expect(user.status).toBe('active')
})

test('Set expression', async () => {
    //  More complex expressions
    user = await User.update(
        {id: user.id},
        {
            set: {
                'location.zip': '${location.zip} + {20}',
            },
        }
    )
    expect(user.location.zip).toBe(98031)
})

test('Set expression with param substitution', async () => {
    //  More complex expressions
    user = await User.update(
        {id: user.id},
        {
            set: {
                tokens: 'list_append(${tokens}, @{newTokens})',
            },
            substitutions: {
                newTokens: ['green'],
            },
        }
    )
    expect(user.tokens).toEqual(['red', 'white', 'blue', 'green'])
})

test('Push value to array (push shortcut)', async () => {
    user = await User.update(
        {id: user.id},
        {
            push: {
                tokens: ['yellow'],
            },
        }
    )
    expect(user.tokens).toEqual(['red', 'white', 'blue', 'green', 'yellow'])
})

test('Set list', async () => {
    //  More complex expressions
    user = await User.update(
        {id: user.id},
        {
            set: {
                tokens: ['green', 'black'],
            },
        }
    )
    expect(user.location.zip).toBe(98031)
})

test('Set list element', async () => {
    user = await User.update({id: user.id}, {set: {'tokens[1]': 'black'}})
    expect(user.tokens[1]).toBe('black')
    //  Revert
    user = await User.update({id: user.id}, {set: {'tokens[1]': 'white'}})
})

test('Set conditional', async () => {
    user = await User.update({id: user.id}, {remove: ['status']})
    expect(user.status).toBeUndefined()

    user = await User.update(
        {id: user.id},
        {
            add: {
                balance: 1,
            },
            set: {
                status: `if_not_exists(\${status}, {active})`,
            },
        }
    )
    expect(user.balance).toBe(8)
    expect(user.status).toBe('active')
})

test('Remove', async () => {
    user = await User.update({id: user.id}, {remove: ['status', 'location.zip']})
    expect(user.status).toBeUndefined()
    expect(user.location.zip).toBeUndefined()
    expect(user.name).toBe('Peter Smith')
})

test('No Execute', async () => {
    let cmd = await User.get({id: user.id}, {execute: false})
    expect(cmd.TableName).toBe('ParamsTestTable')
    expect(cmd.Key.pk).toBeDefined()
    expect(cmd.Key.sk).toBeDefined()
    expect(cmd.ConsistentRead).toBeFalsy()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
