/*
    validation.ts - Crud with validation
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {ValidationSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'ValidateTestTable',
    client: Client,
    partial: false,
    schema: ValidationSchema,
    logger: false,
})

let User
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Get Schema', () => {
    let schema: any = table.getCurrentSchema()
    expect(schema.models).toBeDefined()
    expect(schema.indexes).toBeDefined()
    expect(schema.params).toBeDefined()
    expect(schema.models.User).toBeDefined()
    expect(schema.models.User.pk).toBeDefined()
})

test('Create valid', async () => {
    let params = {
        name: "Peter O'Flanagan",
        email: 'peter@example.com',
        address: '444 Cherry Tree Lane',
        city: 'San Francisco',
        zip: '98103',
        phone: '(408) 4847700',
        status: 'active',
    }
    user = await User.create(params)
    expect(user).toMatchObject(params)
})

test('Update without updating required properties', async () => {
    user = await User.update({id: user.id, age: 42})
    expect(user.age).toBe(42)
})

test('Create invalid', async () => {
    let params = {
        name: "Peter@O'Flanagan",
        email: 'peter example.com',
        address: '444 Cherry Tree Lane[]',
        city: 'New York',
        zip: '98103@@1234',
        phone: 'not-connected',
        age: 99,
        // missing status
    }
    try {
        user = await User.create(params)
        //  Never get here
        expect(false).toBeTruthy()
    } catch (err) {
        expect(err.message).toMatch(/Validation Error in "User"/)
        let validation = err.context.validation
        expect(validation).toBeDefined()
        expect(validation.address).toBeDefined()
        expect(validation.city).toBeDefined()
        expect(validation.email).toBeDefined()
        expect(validation.name).toBeDefined()
        expect(validation.phone).toBeDefined()
        expect(validation.status).toBeDefined()
        expect(validation.zip).toBeDefined()
        expect(validation.age).not.toBeDefined()
    }
})

test('Create missing required property', async () => {
    let params = {
        name: 'Jenny Smith',
        //  Missing email
        address: '444 Cherry Tree Lane',
        status: 'active',
        age: 42,
    }
    try {
        user = await User.create(params)
        //  Never get here
        expect(false).toBeTruthy()
    } catch (err) {
        expect(err.message).toMatch(/Validation Error in "User"/)
        let validation = err.context.validation
        expect(validation).toBeDefined()
        expect(validation.email).toBeDefined()
        expect(validation.status).toBeUndefined()
        expect(validation.age).toBeUndefined()
        expect(validation.name).toBeUndefined()
    }
})

test('Remove required property', async () => {
    try {
        await User.update({id: user.id, email: null})
    } catch (err) {
        expect(err.message).toMatch(/Validation Error in "User"/)
    }
})
