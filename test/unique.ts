/*
    unique.ts - Test unique crud
 */
import {UniqueSchema} from './schemas'
import {Client, Entity, isV2, isV3, Model, Table} from './utils/init'
import {OneTableError} from '../src'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'UniqueTestTable',
    client: Client,
    partial: false,
    schema: UniqueSchema,
    logger: true,
})

type UserType = Entity<typeof UniqueSchema.models.User>
type UserModel = Model<UserType>

// let User: UserModel
let User: Model<Entity<typeof UniqueSchema.models.User>>
let user: UserType
let users: UserType[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create user 1', async () => {
    const props = {
        name: 'Peter Smith',
        email: 'peter@example.com',
    }
    user = await User.create(props)
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(3)

    let pk = (() => {
        if (isV3()) {
            let unique = items.filter((item) => item.pk.S.indexOf('interpolated') >= 0)
            return unique[0].pk.S
        }
        if (isV2()) {
            let unique = items.filter((item) => item.pk.indexOf('interpolated') >= 0)
            return unique[0].pk
        }
    })()
    expect(pk.indexOf('Peter Smith') >= 0).toBe(true)
    expect(pk.indexOf('peter@example.com') >= 0).toBe(true)
    expect(pk.indexOf('User') >= 0).toBe(true)
})

test('Create user 2', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
        phone: '+15555555555',
    }
    user = await User.create(props)
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update user 2 with the same email', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update user 2 with unique email', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy-a@example.com',
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update non-unique property', async () => {
    const props = {
        name: 'Judy Smith',
        age: 42,
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update with unknown property', async () => {
    const props = {
        name: 'Judy Smith',
        age: 15,
        unknown: 'value',
    }
    user = await User.update(props, {return: 'get'})
    const {unknown, ...expectedProps} = props
    expect(user).toMatchObject(expectedProps)

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update to remove optional unique property', async () => {
    const props = {
        name: 'Judy Smith',
        phone: null,
    }
    user = await User.update(props, {return: 'get', log: false})
    const {phone, ...expectedProps} = props
    expect(user).toMatchObject(expectedProps)
    expect(user.phone).toBeUndefined()

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Create non-unique email', async () => {
    const props = {
        name: 'Another Peter Smith',
        email: 'peter@example.com',
    }
    await expect(async () => {
        user = await User.create(props)
    }).rejects.toThrow(
        new OneTableError(
            `Cannot create unique attributes "email, phone, interpolated" for "User". An item of the same name already exists.`,
            {
                code: 'UniqueError',
            }
        )
    )

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Update non-unique email', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'peter@example.com',
    }
    await expect(async () => {
        await User.update(props, {return: 'none'})
    }).rejects.toThrow(
        new OneTableError(
            `Cannot update unique attributes "email, phone, interpolated" for "User". An item of the same name already exists.`,
            {
                code: 'UniqueError',
            }
        )
    )

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Remove user 1', async () => {
    users = await User.scan()
    expect(users.length).toBe(2)

    await User.remove(users[0])
    users = await User.scan()
    expect(users.length).toBe(1)

    let items = await table.scanItems()
    expect(items.length).toBe(3)
})

test('Remove all users', async () => {
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

test('Create user via update', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    let item: any = await User.update(props, {exists: null, return: 'get'})
    expect(item).toMatchObject(props)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
