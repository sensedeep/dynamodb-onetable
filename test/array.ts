import {Client, Table} from './utils/init'

// jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    format: 'onetable:1.1.0',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${email}'},
            sk: {type: String, value: '${_type}#'},
            email: {type: String, required: true},
            addresses: {
                type: Array,
                default: [],
                items: {
                    type: Object,
                    schema: {
                        street: {type: String},
                        zip: {type: Number},
                    },
                },
            },
        },
    } as const,
}

const table = new Table({
    name: 'ArrayTestTable',
    client: Client,
    partial: true,
    schema,
    logger: true,
})

let User = table.getModel('User')

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create User with array', async () => {
    let user = await User.create({
        email: 'user@example.com',
        addresses: [{street: '44 Park Ave', zip: 3000}],
    })
    expect(user).toBeDefined()
    expect(user.addresses!.length).toBe(1)
    expect(user!.addresses![0].street).toBe('44 Park Ave')
    expect(user!.addresses![0].zip).toBe(3000)
})

test('Get Item', async () => {
    let user = await User.get({email: 'user@example.com'})
    expect(user).toBeDefined()
    expect(user!.addresses!.length).toBe(1)
    expect(user!.addresses![0].street).toBe('44 Park Ave')
    expect(user!.addresses![0].zip).toBe(3000)
})

test('Partial array update', async () => {
    //  Should update address and preserve zip
    let user = await User.update({email: 'user@example.com', addresses: [{street: '12 Mayfair'}]})
    expect(user).toBeDefined()
    expect(user!.addresses!.length).toBe(1)
    expect(user!.addresses![0].street).toBe('12 Mayfair')
    expect(user!.addresses![0].zip).toBe(3000)
})

test('Full array update', async () => {
    let user = await User.update({email: 'user@example.com', addresses: [{street: '7 Yellow Brick Road'}]}, {partial: false})
    expect(user).toBeDefined()
    expect(user!.addresses!.length).toBe(1)
    expect(user!.addresses![0].street).toBe('7 Yellow Brick Road')
    expect(user!.addresses![0].zip).toBeUndefined()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
