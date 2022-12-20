/*
    Local.ts - Test LSIs
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {LocalSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'LocalTestTable',
    client: Client,
    partial: false,
    schema: LocalSchema,
    logger: true,
})

const Properties = {
    name: 'Peter Smith',
    email: 'peter@example.com',
}
let User
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        let result: any = await table.createTable()
        expect(result).toBeDefined()
        expect(result.TableDescription).toBeDefined()
        expect(result.TableDescription).toMatchObject({
            TableName: 'LocalTestTable',
            TableSizeBytes: 0,
        })
        expect(await table.exists()).toBe(true)
    }
})

test('Get Schema', () => {
    let schema: any = table.getCurrentSchema()
    expect(schema.models).toBeDefined()
    expect(schema.indexes).toBeDefined()
    expect(schema.params).toBeDefined()
    expect(schema.models.User).toBeDefined()
    expect(schema.models.User.pk).toBeDefined()
})

test('Describe Table', async () => {
    let info: any = await table.describeTable()
    expect(info.Table).toBeDefined()
    expect(info.Table.TableName).toBe('LocalTestTable')
})

test('Validate User model', () => {
    User = table.getModel('User')
    expect(User).toMatchObject({
        name: 'User',
        hash: 'pk',
        sort: 'sk',
    })
})

test('Create', async () => {
    user = await User.create(Properties)
    expect(user).toMatchObject(Properties)
    expect(user.id).toMatch(Match.ulid)
    expect(user.pk).toBeUndefined()
    expect(user.sk).toBeUndefined()
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get by LS1 - by name', async () => {
    //  Get from LS1 with fallback to find.
    user = await User.get({name: user.name}, {index: 'ls1', hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        pk: 'User#',
        sk: `User#${user.id}`,
        ls1sk: `User#${user.name}`,
        ls2sk: `User#User`,
    })
})

test('Get by LS2 - by type', async () => {
    //  type supplied implicitly. This get uses fallback.
    user = await User.get({}, {index: 'ls2', hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        pk: 'User#',
        sk: `User#${user.id}`,
        ls1sk: `User#${user.name}`,
        ls2sk: `User#User`,
    })
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
