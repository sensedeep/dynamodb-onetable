/*
    update.ts - Basic updates
 */
import {AWS, Client, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'UpdateTableTest',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})

let User
let user: any
let users: any[]

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
    User = table.getModel('User')
})

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active', age: 20},
    {name: "Patty O'Furniture", email: 'patty@example.com', status: 'active', age: 30},
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive', age: 40},
]

test('Create Users', async () => {
    for (let item of data) {
        await User.create(item)
    }
    let items = await table.scan('User')
    expect(items.length).toBe(data.length)

    //  Keep users
    users = await User.scan()
    expect(users.length).toBe(data.length)
})

test('Update via where', async () => {
    let user = users.find((u) => u.status == 'active')
    let item = await User.update(
        {id: user.id, status: 'suspended'},
        {
            where: '${status} = {active}',
        }
    )
    expect(item.status).toBe('suspended')
})

test('Update via where with number', async () => {
    // let user = users.find(u => u.status == 'active')
    let item = await User.scan({}, {where: '${age} < {20}', log: true})
    expect(item.length).toBe(0)

    //  Floating
    item = await User.scan({}, {where: '${age} < {21.234}', log: true})
    expect(item.length).toBe(1)
})

test('Update via where throwing', async () => {
    await expect(async () => {
        //  Should throw due to mismatch of where
        let user = users.find((u) => u.status == 'active')
        let item = await User.update(
            {id: user.id, status: 'active'},
            {
                where: '${status} = {active}',
            }
        )
    }).rejects.toThrow()
})

test('Update via where no throw', async () => {
    let user = users.find((u) => u.status == 'active')
    let item = await User.update(
        {id: user.id, status: 'active'},
        {
            where: '${status} = {active}',
            throw: false,
        }
    )
    expect(item).toBeUndefined()
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
