import {Client, Table} from './utils/init'
import {ArrayItemsSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'ArrayItemsTestTable',
    client: Client,
    partial: true,
    schema: ArrayItemsSchema,
    logger: true,
})

const expected = {
    id: '1111-2222',
    arrayWithTypedItems: [{bar: 'Bar', when: new Date()}],
    arrayWithoutTypedItems: ['a', '2', 3, new Date()],
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
    item = await Model.create(expected, {})

    await Model.update({
        id: '1111-2222',
        name: null,
        arrayWithTypedItems: [{foo: null}],
    })

    let when = expected.arrayWithTypedItems[0].when
    expect(item.arrayWithTypedItems[0].when.getTime()).toBe(when.getTime())

    //  Untyped cannot be mapped back to proper types. The date comes back as an ISO string
    when = expected.arrayWithoutTypedItems[3] as Date
    expect(new Date(item.arrayWithoutTypedItems[3]).getTime()).toBe(when.getTime())
})

test('Get Item', async () => {
    item = await Model.get({id: item.id})
    let when = expected.arrayWithTypedItems[0].when
    expect(item.arrayWithTypedItems[0].when.getTime()).toBe(when.getTime())
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
