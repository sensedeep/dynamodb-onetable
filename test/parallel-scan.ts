/*
   Stub for creating a new test file
 */

import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const MaxUsers = 100
const MaxSegments = 4

const table = new Table({
    name: 'ParallelTest',
    client: Client,
    partial: false,
    schema: DefaultSchema,
})
const User = table.getModel('User')
let user: any
let users: any[]

test('Create', async () => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

test('Prepare data', async () => {
    for (let i = 0; i < MaxUsers; i++) {
        await User.create({name: `User-${i}`, status: 'active'})
    }
    users = await table.scan('User')
    expect(users.length).toBe(MaxUsers)
})

test('Stub', async () => {
    let promises: any = []
    for (let segment = 0; segment < MaxSegments; segment++) {
        let promise = table.scanItems(
            {},
            {
                segment,
                segments: MaxSegments,
                parse: true,
                hidden: false,
            }
        )
        promises.push(promise)
    }
    let items = await Promise.all(promises)
    expect(items.length).toBe(MaxSegments)
    items = [].concat.apply([], items)
    expect(items.length).toBe(MaxUsers)
    expect(1).toBe(1)
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
})
