/*
    debug.ts - Just for debug

    Edit your test case here and invoke via: "jest debug"

    Or run VS Code in the top level directory and just run.
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'

//  Use this schema or declare your own inline here
import {DebugSchema} from './schemas'

jest.setTimeout(7200 * 1000)

//  Change your table params as required
const table = new Table({
    name: 'DebugTable',
    client: Client,
    //  Change this if you are using an inline schema
    schema: DebugSchema,
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
    */
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
