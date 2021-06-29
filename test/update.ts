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

test('Update via where', async() => {
    //  FUTURE - need a better data set with multiple items on the same PK
    let users = await User.scan()
    let items = await User.update({id: users[0].id, active: 'suspended'}, {
        where: '${status} = {active}',
        log: true,
    })
    expect(items.length)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
