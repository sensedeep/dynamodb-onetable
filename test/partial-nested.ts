/*
    partial-nested.ts - Basic create / get
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'
import {OneSchema} from '../src/index.js'

// jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    params: {
        isoDates: true,
        timestamps: false,
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${email}'},
            sk: {type: String, value: '${_type}#'},
            email: {type: String, required: true, map: 'em'},
            name: {type: String, required: true, map: 'na'},
            bucket: {
                type: 'object',
                map: 'bu',
                schema: {
                    thing: {type: 'string', map: 'th'},
                    other: {type: 'string', map: 'ot'},
                },
            },
            list: {
                type: 'array',
                default: [],
                map: 'li',
                items: {
                    type: 'object',
                    default: {},
                    schema: {
                        number: {type: 'number', required: true, map: 'nu'},
                    },
                },
            },
        },
    } as const,
}

const table = new Table({
    name: 'PartialNestedTable',
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

test('Test partial object updates', async () => {
    let User = table.getModel('User')
    /*
        Create an item with an object "bucket" that is mapped with mapped members
     */
    let user = await User.create({
        email: 'user@example.com',
        name: 'peter',
        bucket: {
            thing: '42',
            other: 'abc',
        },
    })
    expect(user).toBeDefined()
    expect(user.email).toBe('user@example.com')
    expect(user.bucket).toBeDefined()
    expect(user.bucket!.thing).toBe('42')
    expect(user.bucket!.other).toBe('abc')

    /*
        Do a parital update of bucket.thing with bucket.other unchanged
     */
    user = await User.update(
        {
            email: user.email,
            bucket: {
                thing: '99',
            },
        },
        {partial: true}
    )
    expect(user.bucket!.thing).toBe('99')
    expect(user.bucket!.other).toBe('abc')

    /*
        Do a non-partial update. This removes bucket.other
     */
    user = await User.update(
        {
            email: user.email,
            bucket: {
                thing: '100',
            },
        },
        {partial: false}
    )
    expect(user.bucket!.thing).toBe('100')
    expect(user.bucket!.other).toBeUndefined()
})

test('Test partial array updates', async () => {
    let User = table.getModel('User')
    /*
        Create an item with an object "bucket" that is mapped with mapped members
     */
    let user = await User.create({
        email: 'admin@example.com',
        name: 'ralph',
        list: [{number: 23}],
    })
    expect(user).toBeDefined()
    expect(user.email).toBe('admin@example.com')
    expect(user.list).toBeDefined()
    expect(user.list!.length).toBe(1)
    expect(user.list![0].number).toBe(23)

    let u = await User.get({email: user.email})
    expect(u!.email).toBeDefined()
    expect(user.email).toBe('admin@example.com')
    expect(user.list).toBeDefined()
    expect(user.list!.length).toBe(1)
    expect(user.list![0].number).toBe(23)

    /*
        Cannot do a partial array update (use params {set} instead)
     */
    user = await User.update(
        {
            email: user.email,
            list: [{number: 99}] as any,
        },
        {partial: true}
    )
    expect(user).toBeDefined()
    expect(user.email).toBe('admin@example.com')
    expect(user.list).toBeDefined()
    expect(user.list!.length).toBe(1)
    expect(user.list![0].number).toBe(99)

    //  Same for partial false
    user = await User.update(
        {
            email: user.email,
            list: [{number: 100}] as any,
        },
        {partial: false}
    )
    expect(user).toBeDefined()
    expect(user.email).toBe('admin@example.com')
    expect(user.list).toBeDefined()
    expect(user.list!.length).toBe(1)
    expect(user.list![0].number).toBe(100)

    //  Partial list update will preserve the list (no updates to make)
    user = await User.update(
        {
            email: user.email,
            list: [],
        },
        {partial: true}
    )
    expect(user).toBeDefined()
    expect(user.list!.length).toBe(1)

    //  Set list to empty
    user = await User.update({
        email: user.email,
        list: [],
    })
    expect(user).toBeDefined()
    expect(user.email).toBe('admin@example.com')
    expect(user.list).toBeDefined()
    expect(user.list!.length).toBe(0)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
