/*
    update.ts - Basic updates
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'UpdateTable',
    client: Client,
    schema: DefaultSchema,
})

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

let User = table.getModel('User')
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active' },
    {name: 'Patty O\'Furniture', email: 'patty@example.com', status: 'active' },
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive' },
]

test('Create Users', async() => {
    for (let item of data) {
        await User.create(item)
    }
    let items = await table.scan('User')
    expect(items.length).toBe(data.length)
})

test.skip('Update via where', async() => {
    let items = await User.update({active: 'suspended'}, {
        where: '${status} == {inactive}'
    })
    expect(items.length)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
