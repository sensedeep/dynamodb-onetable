/*
   table-constructor.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

let table: Table = null

test('Create table instance', async() => {
    table = new Table({
        name: 'TableConstructorTestTable',
        // client: Client,
        // schema: DefaultSchema,
    })
    expect(table instanceof Table).toBe(true)
    expect(table.name).toBe('TableConstructorTestTable')
    expect(table.getContext()).toMatchObject({})
})

test('Set Client', async() => {
    table.setClient(Client)
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
