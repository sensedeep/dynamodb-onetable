/*
    unique.ts - Test unique crud
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'
import {UniqueSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'UniqueTestTable',
    client: Client,
    schema: UniqueSchema,
    logger: true,
})

type UserEntity = Entity<typeof UniqueSchema.models.User>;
type UserModel = Model<UserEntity>

let User: UserModel
let user: UserEntity
let users: UserEntity[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create user 1', async() => {
    const props = {
        name: 'Peter Smith',
        email: 'peter@example.com',
    }
    user = await User.create(props, {log: false})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(3)

    let unique = items.filter((item) => item.pk.S.indexOf('interpolated') >= 0)
    let pk = unique[0].pk.S
    expect(pk.indexOf('Peter Smith') >= 0).toBe(true)
    expect(pk.indexOf('peter@example.com') >= 0).toBe(true)
    expect(pk.indexOf('User') >= 0).toBe(true)
})

test('Create user 2', async() => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    user = await User.create(props, {log: false})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Update user 2 with unique email', async() => {
    const props = {
        name: 'Judy Smith',
        email: 'judy-a@example.com',
    }
    user = await User.update(props, {})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})


test('Update non-unique property', async() => {
    const props = {
        name: 'Judy Smith',
        age: 42,
    }
    user = await User.update(props, {})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Create non-unique email', async() => {
    const props = {
        name: 'Another Peter Smith',
        email: 'peter@example.com',
    }
    await expect(async () => {
        user = await User.create(props, {log: false})
    }).rejects.toThrow()

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Update non-unique email', async() => {
    const props = {
        name: 'Judy Smith',
        email: 'peter@example.com',
    }
    await expect(async () => {
        user = await User.update(props, {log: false})
    }).rejects.toThrow()

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Remove user 1', async() => {
    users = await User.scan()
    expect(users.length).toBe(2)

    await User.remove(users[0])
    users = await User.scan()
    expect(users.length).toBe(1)

    let items = await table.scanItems()
    expect(items.length).toBe(3)
})

test('Remove all users', async() => {
    users = await User.scan({})
    expect(users.length).toBe(1)
    for (let user of users) {
        await User.remove(user)
    }
    users = await User.scan({})
    expect(users.length).toBe(0)

    let items = await table.scanItems()
    expect(items.length).toBe(0)
})

test('Create user via update', async() => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    let item: any = await User.update(props, {exists: null})
    expect(item).toMatchObject(props)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
