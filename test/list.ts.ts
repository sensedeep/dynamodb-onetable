/*
    list.ts - List manipulation
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'

// jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#'},
            sk: {type: String, value: '${_type}#${email}'},
            email: {type: String, required: true},
            addresses: {type: Array, default: []},
        },
    } as const,
}

const table = new Table({
    name: 'ListTable',
    client: Client,
    partial: false,
    schema,
    logger: true,
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Test list operations', async () => {
    let User = table.getModel('User')
    let user = await User.create({
        email: 'user@example.com',
        addresses: ['14 park ave'],
    })
    expect(user.addresses).toBeDefined()
    expect(user.addresses?.length).toBe(1)
    expect(user.addresses?.[0]).toBe('14 park ave')

    user = await User.update({email: user.email}, {
        set: {'addresses[0]': '42 Explorer cresent'},
    })
    expect(user.addresses).toBeDefined()
    expect(user.addresses?.length).toBe(1)
    expect(user.addresses?.[0]).toBe('42 Explorer cresent')

    user = await User.update({ email: user.email }, {
        set: {addresses: 'list_append(addresses, @{newAddress})'},
        substitutions: {
            newAddress: ['25 Mayfair cresent'],
        },
    })
    expect(user.addresses).toBeDefined()
    expect(user.addresses?.length).toBe(2)
    expect(user.addresses?.[0]).toBe('42 Explorer cresent')
    expect(user.addresses?.[1]).toBe('25 Mayfair cresent')

    user = await User.update({ email: user.email }, {
        set: {'addresses[1]': '@{newAddress}'},
        substitutions: {
            newAddress: '99 Mayfair cresent',
        },
    })
    expect(user.addresses).toBeDefined()
    expect(user.addresses?.length).toBe(2)
    expect(user.addresses?.[0]).toBe('42 Explorer cresent')
    expect(user.addresses?.[1]).toBe('99 Mayfair cresent')

    user = await User.update({ email: user.email }, {
        set: {'addresses[1]': '101 Pike Street'},
    })
    expect(user.addresses).toBeDefined()
    expect(user.addresses?.length).toBe(2)
    expect(user.addresses?.[0]).toBe('42 Explorer cresent')
    expect(user.addresses?.[1]).toBe('101 Pike Street')
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
