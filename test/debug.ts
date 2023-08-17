/*
    debug.ts - Just for debug

    Edit your test case here and invoke via: "jest debug"

    Or run VS Code in the top level directory and just run.
 */
import {Client, Match, Table} from './utils/init'

jest.setTimeout(7200 * 1000)

//  Change with your schema
const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk'},
    },
    params: {
        createdField: 'createdAt',
        updatedField: 'updatedAt',
        isoDates: true,
        timestamps: true,
    },
    models: {
        User: {
            pk: { type: String, value: '${id}'},

            name: { type: String },
            nickName: { type: String },
            id: { type: String, generate: "ulid" },
            email: { type: String, required: true },
        }
    } as const,
}

//  Change your table params as required
const table = new Table({
    name: 'DebugTable',
    client: Client,
    partial: false,
    schema,
    logger: true,
})

const userProperties = {
    name: "Daenerys I Targaryen",
    nickName: "Breaker of chains",
    email: "iHeartDragons@example.com",
}

let userId: string
const User = table.getModel('User')

beforeAll(async () => {
    //  This will create a local table
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    let user = await User.create(userProperties)
    userId = user.id!
})

test('model.get() respects the fields.', async () => {
    // Works as expected, only returns id and name.
    let userGet = await User.get({pk: userId}, {fields: ["id", "name"], parse: true})
    expect(userGet).toMatchObject({
        name: "Daenerys I Targaryen",
    });
    expect(userGet!.id).toMatch(Match.ulid);
    expect(userGet!.nickName).toBeUndefined();
    expect(userGet!.email).toBeUndefined();
})

test('table.getItem() does not respect the fields.', async () => {
    // Should break but doesn't because the entire record is returned.
    let tableGetItem = await table.getItem({pk: userId}, {fields: ["id", "name"], parse: true})
    expect(tableGetItem).toMatchObject(userProperties);
})
    
test('table.queryItems() does not respect the fields.', async () => {
    // Should break but doesn't because the entire record is returned.
    let tableQueryItems = await table.queryItems({pk: userId}, {fields: ["id", "name"], parse: true})
    expect(tableQueryItems[0]).toMatchObject(userProperties);
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
