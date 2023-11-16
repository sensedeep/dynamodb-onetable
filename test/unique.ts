/*
    unique.ts - Test unique crud
 */
import {UniqueSchema} from './schemas'
import {Client, Entity, isV2, isV3, Model, Table} from './utils/init'
import {OneTableError} from '../src'

// jest.setTimeout(7200 * 1000)

function valueGenerator(
  model,
  fieldName,
  properties,
) {
    // Unique Email
    if (fieldName === 'uniqueValueFunction') {
        // If the item is deleted then remove the uniqueEmail
        if (properties.deletedAt) {
            return null;
        }

        // If no email then there is no change to uniqueEmail field
        if (!properties.otherEmail) {
            return undefined;
        }

        // Set uniqueEmail as the email address
        return properties.otherEmail;
    }
}

const table = new Table({
    name: 'UniqueTestTable',
    client: Client,
    partial: false,
    schema: UniqueSchema,
    logger: true,
    value: valueGenerator,
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

    let items = await table.scanItems()
    expect(items.length).toBe(0)
})

test('Create user 1', async () => {
    const props = {
        name: 'Peter Smith',
        email: 'peter@example.com',
        otherEmail: 'peter@smith.com',
    }
    user = await User.create(props)
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(4)

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
    expect(items.length).toBe(8)
})

test('Update user 2 with the same email', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy@example.com',
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(8)
})

test('Update user 2 with unique email', async () => {
    const props = {
        name: 'Judy Smith',
        email: 'judy-a@example.com',
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(8)
})

test('Update non-unique property', async () => {
    const props = {
        name: 'Judy Smith',
        age: 42,
    }
    user = await User.update(props, {return: 'get'})
    expect(user).toMatchObject(props)

    let items = await table.scanItems()
    expect(items.length).toBe(8)
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
    expect(items.length).toBe(8)
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
    expect(items.length).toBe(7)
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
            `Cannot create unique attributes "email, phone, interpolated, uniqueValueFunction, uniqueValueTemplate" for "User". An item of the same name already exists.`,
            {
                code: 'UniqueError',
            }
        )
    )

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Update non-unique email', async () => {
    let props = {
        name: 'Judy Smith',
        email: 'peter@example.com',
    }
    await expect(async () => {
        await User.update(props, {return: 'none'})
    }).rejects.toThrow(
        new OneTableError(
            `Cannot update unique attributes "email, phone, interpolated, uniqueValueFunction, uniqueValueTemplate" for "User". An item of the same name already exists.`,
            {
                code: 'UniqueError',
            }
        )
    )

    let items = await table.scanItems()
    expect(items.length).toBe(7)
})

test('Soft delete user and create with same email', async () => {
    // Soft delete the user
    let props = {
        name: 'Peter Smith',
        deletedAt: new Date(),
    }
    await User.update(props, {return: 'none'})

    let items = await table.scanItems()
    // Expect the uniqueEmail record to be gone, but the user to still exist
    expect(items.length).toBe(6)

    // Create a new user with the same email
    const createProps = {
        name: 'Another Peter Smith',
        email: 'another-peter@example.com',
        otherEmail: 'peter@smith.com'
    }
    user = await User.create(createProps)

    items = await table.scanItems()
    expect(items.length).toBe(10)
})

test('Unique Code is updated', async () => {
    let props = {
        name: 'John Smith',
        email: 'john@smith.com',
        code: '12345678',
    }
    await User.create(props, {return: 'none'})

    let items = await table.scanItems()
    expect(items.length).toBe(14)

    // Update the user's code
    let updateProps = {
        name: 'John Smith',
        code: '87654321',
    }
    await User.update(updateProps, {return: 'none'})
    items = await table.scanItems()
    console.log(items)

    // Create a new user with the same code
    const createProps = {
        name: 'Jane Doe',
        email: 'jane@doe.com',
        code: '12345678',
    }
    user = await User.create(createProps)

    items = await table.scanItems()
    expect(items.length).toBe(18)
})

test('Remove user 1', async () => {
    users = await User.scan()
    expect(users.length).toBe(5)

    await User.remove(users[0])
    users = await User.scan()
    expect(users.length).toBe(4)

    let items = await table.scanItems()
    expect(items.length).toBe(15)
})

test('Remove all users', async () => {
    users = await User.scan({})
    expect(users.length).toBe(4)
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
