/*
    create-destroy-table.ts
 */
import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {FullSchema} from './schemas'

const TableName = 'CreateDestroyTable'
const table = new Table({
    name: TableName,
    client: Client,
    schema: FullSchema,
})

test('Create', async() => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Table exists', async() => {
    expect(await table.exists()).toBe(true)
})

test('List tables', async() => {
    let tables = await table.listTables()
    expect(tables.length).toBeGreaterThan(0)
    expect(tables).toContain(TableName)
})

test('Destroy', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
    let tables = await table.listTables()
    expect(tables).not.toContain(TableName)
})
