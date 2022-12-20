/*
    create-destroy-table.ts
 */
import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {FullSchema} from './schemas'

const TableName = 'CreateDestroyTable'
const table = new Table({
    name: TableName,
    client: Client,
    partial: false,
    schema: FullSchema,
})

test('Create', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Table exists', async () => {
    expect(await table.exists()).toBe(true)
})

test('List tables', async () => {
    let tables = await table.listTables()
    expect(tables.length).toBeGreaterThan(0)
    expect(tables).toContain(TableName)
})

test('List Models', async () => {
    let models = await table.listModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models).toContain('User')
})

test('Numeric Sort Key', async () => {
    let table = new Table({
        name: 'NumericSortKey',
        client: Client,
        partial: false,
        schema: {
            version: '0.0.1',
            indexes: {primary: {hash: 'pk', sort: 'sk'}},
            models: {User: {sk: {type: 'number'}}},
        },
    })
    await table.createTable()
    await table.deleteTable('DeleteTableForever')
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
    let tables = await table.listTables()
    expect(tables).not.toContain(TableName)
})
