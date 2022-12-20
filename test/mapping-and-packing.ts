/*
    mapping-and-packing.ts - Attribute mapping and packing

    This tests simple mapping of properties to an abbreviated attribute and
    packing properties into a single attribute
 */
import {AWS, Client, Match, Table, print, dump, delay, isV3, isV2} from './utils/init'
import {MappedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'MappingAndPackingTestTable',
    client: Client,
    partial: false,
    schema: MappedSchema,
    // _logger: true,
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User
let user: any
let users: any[]

test('Create', async () => {
    User = table.getModel('User')
    user = await User.create({
        name: 'Peter Smith',
        status: 'active',
        email: 'peter@example.com',
        address: '444 Cherry Tree Lane',
        city: 'Paris',
        zip: '1234567',
    })
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Get', async () => {
    user = await User.get({id: user.id})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Get including hidden', async () => {
    //  Returns property names without hidden (primaryKey)
    let u = await User.get({id: user.id}, {hidden: true})
    expect(u).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
        primarySort: 'us#',
        gs1pk: 'ty#us',
        gs1sk: `us#${u.email}`,
    })
    expect(u.id).toMatch(Match.ulid)
    expect(u.primaryHash).toEqual(`us#${u.id}`)
    expect(u.primarySort).toEqual(`us#`)
    expect(u.gs1pk).toEqual(`ty#us`)
    expect(u.gs1sk).toEqual(`us#${u.email}`)
})

test('Get without parse', async () => {
    //  Returns attributes without parsing including hidden (pk, sk)
    let u = await User.get({id: user.id}, {hidden: true, parse: false})
    if (isV3()) {
        expect(u.id.S).toMatch(Match.ulid)
        expect(u.em.S).toEqual('peter@example.com')
        expect(u.pk.S).toEqual(`us#${u.id.S}`)
        expect(u.sk.S).toEqual(`us#`)
        expect(u.pk1.S).toEqual(`ty#us`)
        expect(u.sk1.S).toEqual(`us#${user.email}`)
    }
    if (isV2()) {
        expect(u.id).toMatch(Match.ulid)
        expect(u.em).toEqual('peter@example.com')
        expect(u.pk).toEqual(`us#${u.id}`)
        expect(u.sk).toEqual(`us#`)
        expect(u.pk1).toEqual(`ty#us`)
        expect(u.sk1).toEqual(`us#${user.email}`)
    }
})

test('Get via GSI', async () => {
    let u = await User.get({email: user.email}, {index: 'gs1', follow: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by ID', async () => {
    users = await User.find({id: user.id})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Find by name on GSI', async () => {
    users = await User.find({name: user.name}, {index: 'gs1', follow: true})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'active',
    })
})

test('Update', async () => {
    user = await User.update({id: user.id, status: 'inactive'})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        status: 'inactive',
    })
    expect(user.id).toMatch(Match.ulid)
})

test('Remove attribute', async () => {
    //  Remove attribute by setting to null
    user = await User.update({id: user.id, status: null})
    expect(user.status).toBeUndefined()
})

test('Remove attribute 2', async () => {
    //  Update and remove attributes using {remove}
    user = await User.update({id: user.id, email: 'peter@gmail.com'}, {remove: ['status'], hidden: true})
    expect(user).toMatchObject({
        name: 'Peter Smith',
        email: 'peter@gmail.com',
        primarySort: 'us#',
    })
    expect(user.status).toBeUndefined()
    expect(user.id).toMatch(Match.ulid)
})

test('Remove item', async () => {
    await User.remove({id: user.id})
    user = await User.get({id: user.id})
    expect(user).toBeUndefined()
})

test('Scan', async () => {
    user = await User.create({name: 'Sky Blue', status: 'active'})
    users = await User.scan({})
    expect(users.length).toBe(1)
    user = users[0]
    expect(user).toMatchObject({
        name: 'Sky Blue',
        status: 'active',
    })
})

test('Remove all users', async () => {
    users = await User.scan({})
    expect(users.length).toBe(1)

    for (let user of users) {
        await User.remove({id: user.id})
    }
    users = await User.scan({})
    expect(users.length).toBe(0)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
