/*
    mock.ts - Used to mock scenarios
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: "MockTable",
    client: Client,
    logger: true,
    schema: {
        indexes: {
            primary: { hash: 'userName' },
        },
        models: {}
    }
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create', async() => {
    let result = await table.putItem({
        userName: 'ralph', 
        email: 'ralph@example.com'
    }, {parse: true})

    result = await table.scanItems({}, {parse: true})
    result = await table.queryItems({userName: 'ralph'}, {parse: true})
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
