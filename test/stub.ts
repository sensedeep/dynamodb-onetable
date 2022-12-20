/*
   Stub for creating a new test file
 */

import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'StubTest',
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

test('Stub', async () => {
    //  Do something
    expect(1).toBe(1)
})

test('Destroy', async () => {
    await table.deleteTable('DeleteTableForever')
})
