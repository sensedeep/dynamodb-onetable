/*
    partial.ts - Partial updates

 */
import {Client, Entity, Table, dump} from './utils/init'
import {OneSchema} from '../src/index.js'

jest.setTimeout(7200 * 1000)

//  Cannot type as OneSchema -- it breaks things

const Schema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk', project: 'all' },
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'all' },
    },
    models: {
        User: {
            /*
                Rules:
                - Default params should not be required
                - Generate params should not be required
                - Nested schemas do not require default {}
            */
            pk:          { type: 'string', value: '${_type}#${id}' },
            sk:          { type: 'string', value: '${_type}#' },
            id:          { type: 'string', required: true, generate: 'ulid' },
            email:       { type: 'string', required: true },
            status:      { type: 'string', required: true, default: 'active' },
            address:     { type: Object, schema: {
                street:  { type: 'string' },
                zip:     { type: 'number' },
                box:     { type: Object, schema: {
                    start: { type: Date },
                    end: { type: Date },
                }}
            }}
        }
    } as const,
    params: { },
} as const

const table = new Table({
    name: 'PartialTableTest',
    client: Client,
    partial: true,
    schema: Schema as OneSchema,
    logger: true,
})

type UserType = Entity<typeof Schema.models.User>
let User = table.getModel<UserType>('User')
let user
let users

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create User', async() => {
    user = await User.create({
        email: 'user@example.com',
        id: '42',
        status: 'active',
        address: {
            street: '42 Park Ave',
            zip: 12345,
            box: {},
        }
    })
    expect(user.email).toBe('user@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(12345)
})

test('Get User', async() => {
    user = await User.get({
        id: user.id,
        address: {
            zip: 12345,
            box: {},
        }
    })
    expect(user.email).toBe('user@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(12345)
})

test('Find User', async() => {
    users = await User.find({
        id: user.id,
        address: {
            zip: 12345,
        }
    })
    expect(users.length).toBe(1)
    user = users[0]
    expect(user.email).toBe('user@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(12345)
})

test('Update Email', async() => {
    user = await User.update({
        id: user.id,
        email: 'ralph@example.com',
        address: {
            box: {
                start: new Date(),
                end: new Date()
            }
        }
    })
    expect(user.email).toBe('ralph@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(12345)

    //  Check with get
    user = await User.get({id: user.id})
    expect(user.email).toBe('ralph@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(12345)
})

test('Update Zip Only', async() => {
    //  Update zip and preserve address
    user = await User.update({
        id: user.id,
        address: {
            zip: 99999
        }
    })
    expect(user.email).toBe('ralph@example.com')
    expect(user.address.street).toBe('42 Park Ave')
    expect(user.address.zip).toBe(99999)
})

test('Update Zip Only', async() => {
    //  Update full address (!partial). Update zip and remove address
    user = await User.update({
        id: user.id,
        address: {
            zip: 22222
        }
    }, {partial: false})
    expect(user.email).toBe('ralph@example.com')
    expect(user.address.street).toBe(undefined)
    expect(user.address.zip).toBe(22222)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
