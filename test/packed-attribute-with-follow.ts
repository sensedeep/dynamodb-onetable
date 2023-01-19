/*
    packed-attribute-with-follow.ts -- test GSI
 */
import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {FullSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'PackedAttributeWithFollowTable',
    client: Client,
    partial: false,
    schema: FullSchema,
})

test('Create', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

const User = table.getModel('User')
let user: any

test('Create User', async () => {
    /*
        The address, city and zip properties are packed into the single 'data' attribute.
        All packed properties must be provided.
    */
    user = await User.create(
        {
            name: 'Peter Smith',
            zip: '98011',
            address: '444 Cherry Tree Lane',
            city: 'Seattle',
        },
        {log: true}
    )
    expect(user.name).toBe('Peter Smith')
    expect(user.address).toBe('444 Cherry Tree Lane')
})

test('Get User', async () => {
    user = await User.get({id: user.id})
    expect(user.name).toBe('Peter Smith')
    expect(user.address).toBe('444 Cherry Tree Lane')
    expect(user.city).toBe('Seattle')
})

test('Find without follow', async () => {
    //  Without follow will fetch just the GSI data
    let items: any = await User.find({name: 'Peter Smith'}, {index: 'gs1', hidden: true})
    expect(items.length).toBe(1)
    let item = items[0]
    expect(item.pk).toBeDefined()
    expect(item.gs1pk).toBeDefined()
    expect(item.gs1sk).toBeDefined()
    expect(item.address).toBeDefined()
    expect(item.city).toBeDefined()
    expect(item.zip).toBeDefined()
    expect(item.name).toBeUndefined()
})

test('Find with follow', async () => {
    //  With follow, will follow the GSI and fetch the entire user
    let users: any = await User.find({name: 'Peter Smith'}, {index: 'gs1', follow: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user.name).toBe('Peter Smith')
    expect(user.id).toBeDefined()
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
})
