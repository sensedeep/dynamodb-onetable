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
    models: {
        User: {
            pk: {type: 'string', value: '${_type}#'},
            sk: {type: 'string', value: '${_type}#${id}'},

            gs1pk: {type: 'string', value: '${_type}#'},
            gs1sk: {type: 'string', value: '${_type}#${id}'},

            name: {type: 'string'},
            email: {type: 'string'},
            id: {type: 'string', generate: 'ulid'},
        },
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
    /*
    Put your code here

    let User = table.getModel('User')
    let users = await User.find({})
*/
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
