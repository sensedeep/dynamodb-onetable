/*
    v2.ts - AWS V2 SDK test
 */
import {AWS, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'
import DynamoDB from 'aws-sdk/clients/dynamodb'

const PORT = parseInt(process.env.DYNAMODB_PORT)

const client = new DynamoDB.DocumentClient({
    endpoint: `http://localhost:${PORT}`,
    region: 'local',
    credentials: new AWS.Credentials({
        accessKeyId: 'test',
        secretAccessKey: 'test',
    })
})

const table = new Table({
    name: 'V2TestTable',
    client: client,
    schema: DefaultSchema,
    timestamps: true,
    isoDates: true,
    uuid: 'ulid',
})

let User = null
let user: any
let users: any[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Set Client', async() => {
    table.setClient(client)
})

test('Get Schema', () => {
    let schema:any = table.getSchema()
    expect(schema.name).toBe('V2TestTable')
    expect(schema.models).toBeDefined()
    expect(schema.indexes).toBeDefined()
    expect(schema.models.User).toBeDefined()
    expect(schema.models.User.pk).toBeDefined()
})

test('List tables', async() => {
    let tables = await table.listTables()
    expect(tables.length).toBeGreaterThan(0)
    expect(tables).toContain('V2TestTable')
})

test('Describe Table', async() => {
    let info:any = await table.describeTable()
    expect(info.Table).toBeDefined()
    expect(info.Table.TableName).toBe('V2TestTable')
})

test('List Models', async() => {
    let models = table.listModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain('User')
})

test('Validate User model', () => {
    User = table.getModel('User')
    expect(User).toMatchObject({
        name: 'User',
        hash: 'pk',
        sort: 'sk',
    })
})

test('Create', async() => {
    user = await User.create({name: 'Peter Smith', status: 'active'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Get', async() => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get including hidden', async() => {
    user = await User.get({id: user.id}, {hidden: true})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        sk: 'user#',
        gs1pk: 'user#Peter Smith',
        gs1sk: 'user#',
    })
    expect(user.id).toMatch(Match.ulid)
    expect(user.pk).toMatch(/^user#/)
})

test('Get raw', async() => {
    let data = await User.get({id: user.id}, {parse: false, hidden: true})
    //  ISO dates 2021-06-30T01:27:19.986Z
    expect(data.created).toMatch(/2.*Z/)
    expect(data.updated).toMatch(/2.*Z/)
})

test('Find by ID', async() => {
    users = await User.find({id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by name on GSI', async() => {
    users = await User.find({name: user.name}, {index: 'gs1'})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async() => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Remove attribute', async() => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async() => {
    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk'], hidden: true})
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Peter Smith',
        status: 'active',
        sk: 'user#',
    })
    expect(user.gs1pk).toBeUndefined()
    expect(user.gs1sk).toBeUndefined()
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item', async() => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async() => {
    user = await User.create({name: 'Sky Blue', status: 'active'})
    users = await User.scan({})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        _type: 'User',
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async() => {
    users = await User.scan({})
    expect(users.length).toBe(1)

    for (let user of users) {
        await User.remove({id: user.id})
    }
    users = await User.scan({})
    expect(users.length).toBe(0)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
