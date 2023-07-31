/*
    debug.ts - Just for debug

    Edit your test case here and invoke via: "jest debug"

    Or run VS Code in the top level directory and just run.
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'
import {OneSchema} from '../src/index.js'

jest.setTimeout(7200 * 1000)

//  Change with your schema
const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    params: {
        createdField: 'createdAt',
        updatedField: 'updatedAt',
        isoDates: true,
        timestamps: true,
    },
    models: {
        User: {
            pk: { type: String, value: '${_type}#${email}' },
            sk: { type: String, value: '${_type}#' },
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

//  This will create a local table
test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Test', async () => {
    let User = table.getModel('User')
    /*
    let user = await User.create({
        email: "user@example.com",
    })
    dump("USER", user)
    let result = await User.find({}, {log: true})
    */
    /*
    Put your code here
    */
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
