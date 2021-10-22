/*
    debug.ts - Just for debug
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'
import {DebugSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTable',
    client: Client,
    schema: DebugSchema,
    uuid: 'ulid',
    logger: true,
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
let users: any

class AdminUserModel extends Model<UserType> {
    constructor() {
        super(table, 'User')
    }
}
const AdminUser = new AdminUserModel()

test('Test', async() => {
    user = undefined

    user = await User.create({
        email: 'coy@acme.com',
        domain: 'local',
    }, {log: false, hidden: true})

    user = await AdminUser.create({
        email: 'rr@acme.com',
        domain: 'local',
    }, {log: false, hidden: true})
    // dump("USER", user)

    // users = await User.find({sk: null}, {log: false, hidden: true})

    // users = await AdminUser.find({}, {index: 'gs1', log: false, hidden: true})

    // dump("USERS", users)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
