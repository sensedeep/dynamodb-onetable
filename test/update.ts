/*
    update.ts - Basic updates
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'UpdateTableTest',
    client: Client,
    schema: DefaultSchema,
    logger: true,
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

test('Update via where', async() => {
    //  FUTURE - need a better data set with multiple items on the same PK
    let users = await User.scan()
    expect(users.length).toBe(data.length)
    let item = await User.update({id: users[0].id, status: 'suspended'}, {
        where: '${status} = {active}',
        // log: true,
    })
    expect(item.status).toBe('suspended')
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
