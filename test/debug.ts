/*
    debug.ts - Just for debug
 */
import {AWS, Client, Entity, Match, Table, print, dump, delay} from './utils/init'
import {PagedSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTable',
    client: Client,
    schema: PagedSchema,
    uuid: 'ulid',
})
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof PagedSchema.models.User>
let User = table.getModel<UserType>('User')
let user: UserType = null

function zpad(n: number, size: number): string {
    let s = n + ''
    while (s.length < size) s = '0' + s
    return s
}

test('Create Users', async() => {
    for (let i = 0; i < 100; i++) {
        await User.create({name: `user-${zpad(i, 4)}`})
    }
    let items = await User.scan()

    //  Scan forwards
    let start = null
    do {
        let items = await User.find({}, {limit: 10, start, reverse: true})
        start = items.start
    } while (start)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
