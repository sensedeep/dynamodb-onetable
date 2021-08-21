/*
    unique.ts - Test unique crud
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {UniqueSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'UniqueTestTable',
    client: Client,
    schema: UniqueSchema,
    logger: true,
})

let User = null
let user: any
let users: any[]

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
    user = await User.create(props)
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(3)

    let unique = items.find((item) => {
        return item.pk.S === 'User:interpolated:Peter Smith:peter@example.com'
    });
    expect(unique).toBeDefined();
})

test('Create user 2', async() => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    user = await User.create(props)
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(6)
})

test('Create non-unique user', async() => {
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

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
