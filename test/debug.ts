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
    await User.create({name: 'Michael'})
    await User.create({name: 'Peter'})
    await User.create({name: 'George'})

    let users = await User.scan()

    /*
    let batch = {}
    table.remove('User', {id: users[0].id}, {batch})
    table.remove('User', {id: users[1].id}, {batch})
    table.update('User', { id: users[2].id, name: 'test'}, {batch})

    let items: any = await table.batchWrite(batch, {parse: true, hidden: false})
    dump(items)
    */
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
