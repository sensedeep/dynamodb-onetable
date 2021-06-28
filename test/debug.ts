/*
    Test just for debugging the latest great code idea
 */
import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {DebugSchema} from './schemas'

describe('Debug only', () => {
const table = new Table({
    name: 'DebugTest',
    client: Client,
    schema: DebugSchema,
})
const User = table.getModel('User')

test('Create', async() => {
    if (!(await table.exists())) {
        await table.createTable()
    }
})

let user: any

test('User Create', async() => {
    user = await User.create({
        name: 'Peter Smith',
        location: {
            zip: 98011,
            address: '444 Cherry Tree Lane',
            city: 'Seattle',
        }
    })
})

test('GetItem', async() => {
    let item = await table.getItem({
        pk: `user#${user.id}`,
        sk: 'user#',
    })
})

test('Destroy', async() => {
    await table.deleteTable('DeleteTableForever')
})
})
