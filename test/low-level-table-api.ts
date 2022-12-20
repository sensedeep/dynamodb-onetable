/*
   low-level-table-api.ts -
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'LowLevelTableApiTestTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})

const Properties = {
    pk: 'custom#Peter Smith',
    sk: 'custom#12345',
    name: 'Peter Smith',
    status: 'idle',
    profile: {avatar: 'eagle'},
}

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let item: any
let items: any[]

test('Create Item', async () => {
    item = await table.putItem(Properties, {parse: true})
    expect(item).toMatchObject(Properties)
})

test('Get Item', async () => {
    item = await table.getItem({pk: Properties.pk, sk: Properties.sk}, {parse: true})
    expect(item).toMatchObject(Properties)
})

test('Update Item', async () => {
    item = await table.updateItem({pk: Properties.pk, sk: Properties.sk, status: 'active'}, {parse: true})
    expect(item.status).toBe('active')

    //  Revert
    item = await table.updateItem({pk: Properties.pk, sk: Properties.sk, status: 'idle'}, {parse: true})
    expect(item).toMatchObject(Properties)
})

test('Query Items', async () => {
    items = await table.queryItems({pk: Properties.pk, sk: Properties.sk}, {parse: true})
    expect(items.length).toBe(1)
    item = items[0]
    expect(item).toMatchObject(Properties)
})

test('QueryItems with begins', async () => {
    items = await table.queryItems({pk: Properties.pk, sk: {begins: 'custom'}}, {parse: true})
    expect(items.length).toBe(1)
    item = items[0]
    expect(item).toMatchObject(Properties)
})

test('ScanItems', async () => {
    items = await table.scanItems({}, {parse: true})
    expect(items.length).toBe(1)
    item = items[0]
    expect(item).toMatchObject(Properties)
})

test('ScanItems with filter', async () => {
    items = await table.scanItems({status: 'idle'}, {parse: true})
    expect(items.length).toBe(1)
    item = items[0]
    expect(item).toMatchObject(Properties)
})

test('Remove Item', async () => {
    await table.deleteItem({pk: Properties.pk, sk: Properties.sk})
    items = await table.scanItems({}, {parse: true})
    expect(items.length).toBe(0)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
