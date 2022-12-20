/*
   table-constructor.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

let TableName = 'TableConstructorTestTable'
// Schema need to be passed because its not in the constructor. Using any because it gets modified
let table: Table

test('Create table instance', async () => {
    table = new Table({
        name: TableName,
        partial: false,
    })
    expect(table instanceof Table).toBe(true)
    expect(table.name).toBe(TableName)
    expect(table.getContext()).toMatchObject({})
})

test('Create table args', async () => {
    await expect(async () => {
        //  Missing essential args
        table = new Table({partial: false})
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

test('Create table with various params', async () => {
    table = new Table({
        name: TableName,
        logger: (type, message, context) => {
            if (type == 'trace' || type == 'data') return
            console.log(`${new Date().toLocaleString()}: ${type}: ${message}`)
            console.log(JSON.stringify(context, null, 4) + '\n')
        },
        partial: false,
        schema: DefaultSchema,
    })
    expect(table instanceof Table).toBe(true)
})

test('Set Client', async () => {
    table.setClient(Client)
})

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    await expect(async () => {
        //  Missing confirmation string
        await table.deleteTable('')
    }).rejects.toThrow()

    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with provisioned throughput', async () => {
    table = new Table({
        name: TableName,
        partial: false,
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

test('Create table with GSI and project keys', async () => {
    table = new Table({
        name: TableName,
        client: Client,
        partial: false,
        schema: {
            version: '0.0.1',
            indexes: {
                primary: {hash: 'pk', sort: 'sk'},
                gs1: {hash: 'id', sort: 'email', project: 'keys'},
            },
            models: {
                User: {
                    pk: {type: String, value: 'user#${email}'},
                    sk: {type: String, value: 'user#${email}'},
                    id: {type: String, generate: 'ulid'},
                    email: {type: String, required: true},
                },
            },
            params: {},
        },
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable()
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with LSI and project', async () => {
    table = new Table({
        name: TableName,
        client: Client,
        partial: false,
        schema: {
            format: 'onetable:1.1.0',
            version: '0.0.1',
            indexes: {
                primary: {hash: 'pk', sort: 'sk'},
                ls1: {type: 'local', sort: 'email', project: 'all'},
            },
            models: {
                User: {
                    pk: {type: String, value: 'user#${email}'},
                    sk: {type: String, value: 'user#'},
                    name: {type: String},
                    email: {type: String},
                },
            },
            params: {},
        },
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable()
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})

test('Create table with LSI', async () => {
    table = new Table({
        name: TableName,
        client: Client,
        partial: false,
        schema: {
            format: 'onetable:1.1.0',
            version: '0.0.1',
            indexes: {
                primary: {hash: 'pk', sort: 'sk'},
                ls1: {type: 'local', sort: 'email'},
                gs1: {hash: 'name', sort: 'email'},
            },
            models: {
                User: {
                    pk: {type: String, value: 'user#${email}'},
                    sk: {type: String, value: 'user#'},
                    name: {type: String},
                    email: {type: String},
                },
            },
            params: {},
        },
    })
    expect(table instanceof Table).toBe(true)
    await table.createTable()
    expect(await table.exists()).toBe(true)
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
