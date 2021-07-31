/*
    debug.ts - Just for debug
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {DebugSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTable',
    client: Client,
    schema: DebugSchema,
    uuid: 'ulid',
})
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof DebugSchema.models.User>
let User = table.getModel<UserType>('User')
let user: UserType = null

test('Test', async() => {
    let date = new Date()
    // User.create({pk: 'pk', sk: 'sk', enable: true })
    // User.create({pk: 'pk', sk: 'sk', date: date })
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
