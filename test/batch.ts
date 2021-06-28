/*
   Batch get/write 
 */

import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'BatchTest',
    client: Client,
    schema: DefaultSchema,
})
const User = table.getModel('User')
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active' },
    {name: 'Patty O\'Furniture', email: 'patty@example.com', status: 'active' },
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive' },
]

test('Create', async() => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Batch put', async() => {
    let batch = {}
    for (let item of data) {
        table.create('User', item, {batch})
    }
    await table.batchWrite(batch)
    users = await table.scan('User')
    expect(users.length).toBe(data.length)
})

test('Batch get', async() => {
    let batch = {}
    for (let user of users) {
        table.get('User', {id: user.id}, {batch})
    }
    let items:any = await table.batchGet(batch, {parse: true, hidden: false})
    expect(items.length).toBe(data.length)

    for (let item of items) {
        let datum = data.find(i => i.name == item.name)
        expect(item).toMatchObject(datum)
    }
})

test('Batch put and delete combined', async() => {
    let batch = {}

    table.remove('User', {id: users[0].id}, {batch})
    table.remove('User', {id: users[1].id}, {batch})
    table.remove('User', {id: users[2].id}, {batch})
    table.create('User', data[0], {exists: null, batch})

    let items:any = await table.batchWrite(batch, {parse: true, hidden: false})

    users = await table.scan('User')
    expect(users.length).toBe(1)
    expect(users[0]).toMatchObject(data[0])
})


test('Destroy', async() => {
    await table.deleteTable('DeleteTableForever')
})
