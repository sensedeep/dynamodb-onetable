/*
    debug.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'DebugTestTable',
    client: Client,
    schema: DefaultSchema,
    /*
    logger: (type, message, context) => {
        console.log(`${new Date().toLocaleString()}: ${type}: ${message}`);
        console.log(JSON.stringify(context, null, 4) + '\n');
    } */
})

let User = null
let user: any
let users: any[]

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

test('Create', async() => {
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
