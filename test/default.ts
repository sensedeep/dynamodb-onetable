/*
    default.ts - Basic create, read, update delete
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'DefaultTestTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
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

test('Create', async () => {
    let properties = {
        name: 'Peter Smith',
        email: 'peter@example.com',
    }
    user = await User.create(properties)
    //  Status should have default value
    expect(user.status).toBe('idle')
    expect(user).toMatchObject(properties)
    expect(user.id).toMatch(Match.ulid)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
