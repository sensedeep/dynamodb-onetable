/*
    debug.ts - Just for debug

    Edit your test case here and invoke via: "jest debug"

    Or run VS Code in the top level directory and just run.
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'

jest.setTimeout(7200 * 1000)

//  Change with your schema
const schema = {
    version: '0.0.1',
    indexes: {
        primary: { hash: 'pk', sort: 'sk' },
        gs1: { hash: 'gs1pk', sort: 'gs1sk', project: 'all' },
    },
    models: {
        User: {
            pk:          { type: String, value: '${_type}#' },
            sk:          { type: String, value: '${_type}#${id}' },

            gs1pk:       { type: String, value: '${_type}#' },
            gs1sk:       { type: String, value: '${_type}#${id}' },

            name:        { type: String },
            email:       { type: String },
            id:          { type: String, uuid: 'ulid' },
        }
    }
}

//  Change your table params as required
const table = new Table({
    name: 'DebugTable',
    client: Client,
    schema,
    logger: true,
})

//  This will create a local table
test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Test', async() => {
/*
    Put your code here

    let User = table.getModel('User')
    let users = await User.find({})
*/
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
