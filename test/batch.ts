/*
   Batch get/write
 */

import {DefaultSchema} from './schemas'
import {Client, isV2, isV3, Table} from './utils/init'

// jest.setTimeout(7200 * 1000)

const table = new Table({
    name: 'BatchTest',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})
const User = table.getModel('User')
let user: any
let users: any[]

let data = [
    {name: 'Peter Smith', email: 'peter@example.com', status: 'active'},
    {name: "Patty O'Furniture", email: 'patty@example.com', status: 'active'},
    {name: 'Cu Later', email: 'cu@example.com', status: 'inactive'},
]

test('Create', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Batch put', async () => {
    let batch = {}
    for (let item of data) {
        table.create('User', item, {batch})
    }
    await table.batchWrite(batch)
    users = await table.scan('User')
    expect(users.length).toBe(data.length)
})

test('Batch get', async () => {
    let batch = {}
    for (let user of users) {
        table.get('User', {id: user.id}, {batch})
    }
    let items: any = await table.batchGet(batch, {
        parse: true,
        hidden: false,
        consistent: true,
    })
    expect(items.length).toBe(data.length)

    for (let item of items) {
        let datum = data.find((i) => i.name == item.name)
        if (datum) {
            expect(item).toMatchObject(datum)
        }
    }

    batch = {}
    let id = users[0].id
    User.remove({id}, {where: `${id} = {${id}}`, batch})
    await table.batchWrite(batch)
})

test('Batch put and delete combined', async () => {
    let batch = {}

    table.remove('User', {id: users[0].id}, {batch})
    table.remove('User', {id: users[1].id}, {batch})
    table.remove('User', {id: users[2].id}, {batch})
    table.create('User', data[0], {exists: null, batch})

    let items: any = await table.batchWrite(batch, {parse: true, hidden: false})

    users = await table.scan('User')
    expect(users.length).toBe(1)
    expect(users[0]).toMatchObject(data[0])
})

test('Batch get without parse', async () => {
    let batch = {}
    for (let user of users) {
        table.get('User', {id: user.id}, {batch})
    }
    let response: any = await table.batchGet(batch, {hidden: false})
    expect(response.Responses).toBeDefined()
    expect(response.Responses.BatchTest).toBeDefined()
})

test('Batch with error', async () => {
    let batch: any = {}
    for (let user of users) {
        table.get('User', {id: user.id}, {batch})
    }
    await expect(async () => {
        //  Corrupt the batch object
        batch.RequestItems = 42
        await table.batchGet(batch, {parse: true, hidden: false, consistent: true})
    }).rejects.toThrow()

    batch = {}
    table.create('User', {name: 'Buy MoreMilk', email: 'milk@example.com', status: 'inactive'}, {batch})
    await expect(async () => {
        //  Corrupt the batch object
        batch.RequestItems = 42
        await table.batchWrite(batch)
    }).rejects.toThrow()
})

test('Batch with fields', async () => {
    //  Get with fields
    let batch = {}
    users = await table.scan('User')
    for (let user of users) {
        table.get('User', {id: user.id}, {batch})
    }

    users = await table.batchGet(batch, {parse: true, fields: ['email']})
    for (let user of users) {
        expect(user.name).toBeUndefined()
        expect(user.email).toBeDefined()
    }
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
})
