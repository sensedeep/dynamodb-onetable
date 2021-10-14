/*
   table-constructor.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

let TableName = 'TableConstructorTestTable'
let table: Table = null

test('Create table instance', async() => {
    table = new Table({
        name: TableName,
    })
    expect(table instanceof Table).toBe(true)
    expect(table.name).toBe(TableName)
    expect(table.getContext()).toMatchObject({})
})

test('Create table args', async() => {
    await expect(async () => {
        //  Missing essential args
        table = new Table({})
    }).rejects.toThrow()

    /* TS now catches this
    await expect(async () => {
        table = new Table({name: TableName, schema: {}})
    }).rejects.toThrow()

    await expect(async () => {
        table = new Table({name: TableName, schema: {models: {}}})
    }).rejects.toThrow()
    */
})

test('Create table with various params', async() => {
    table = new Table({
        name: TableName,
        logger: (type, message, context) => {
            if (type == 'trace' || type == 'data') return
            console.log(`${new Date().toLocaleString()}: ${type}: ${message}`)
            console.log(JSON.stringify(context, null, 4) + '\n')
        },
        schema: DefaultSchema,
        generic: true,
        hidden: true,
        uuid: 'uuid',
    })
    expect(table instanceof Table).toBe(true)
})

test('Set Client', async() => {
    table.setClient(Client)
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    await expect(async() => {
        //  Missing confirmation string
        await table.deleteTable('')
    }).rejects.toThrow()

    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with provisioned throughput', async() => {
    table = new Table({
        name: TableName,
        schema: DefaultSchema,
        client: Client,
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable({
        ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10,
        },
    })
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with GSI and project keys', async() => {
    table = new Table({
        name: TableName,
        client: Client,
        schema: {
            version: '0.0.1',
            indexes: {
                primary: { hash: 'pk', sort: 'sk' },
                gs1: { hash: 'id', sort: 'email', project: 'keys' },
            },
            models: {
                User: {
                    pk: { type: String, value: "user#${email}" },
                    sk: { type: String, value: "user#${email}" },
                    id: { type: String, uuid: true },
                    email: { type: String, required: true },
                }
            }
        }
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable()
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with LSI and project', async() => {
    table = new Table({
        name: TableName,
        client: Client,
        schema: {
            version: '0.0.1',
            indexes: {
                primary: { hash: 'pk', sort: 'sk' },
                //  Should fail -- projects not legal
                ls1: { sort: 'email', project: 'keys' },
            },
            models: {
                User: {
                    pk:     { type: String, value: 'user#${email}' },
                    sk:     { type: String, value: 'user#' },
                    name:   { type: String },
                    email:  { type: String },
                }
            }
        }
    })
    expect(table instanceof Table).toBe(true)
    await expect(async() => {
        await table.createTable()
    }).rejects.toThrow()
})

test('Create table with LSI', async() => {
    table = new Table({
        name: TableName,
        client: Client,
        schema: {
            version: '0.0.1',
            indexes: {
                primary: { hash: 'pk', sort: 'sk' },
                ls1: { sort: 'email' },
                gs1: { hash: 'name', sort: 'email' },
            },
            models: {
                User: {
                    pk:     { type: String, value: 'user#${email}' },
                    sk:     { type: String, value: 'user#' },
                    name:   { type: String },
                    email:  { type: String },
                }
            }
        }
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable()
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
