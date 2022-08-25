import {Client, Table} from './utils/init'
import {ArrayItemsSchema} from './schemas'

const table = new Table({
    name: 'ArrayItemsTestTable',
    client: Client,
    partial: false,
    schema: ArrayItemsSchema,
})

const expected = {
    id: '1111-2222',
    arrayWithTypedItems: [{bar: 'Bar'}],
    arrayWithoutTypedItems: ['a', '2', 3]
}

let Model = table.getModel('TestModel')
let item: any

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

test('Create', async () => {
    item = await Model.create(expected)
    expect(item).toMatchObject(expected)
})

test('Get Item', async () => {
    item = await Model.get({id: item.id})
    expect(item).toMatchObject(expected)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
