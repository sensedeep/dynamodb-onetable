/*
        transform.ts - Operations with Table transform
 */
import {AnyEntity, AnyModel} from '../src'
import {DefaultSchema} from './schemas'
import {Client, Table} from './utils/init'

const table = new Table({
    name: 'TransformTestTable',
    client: Client,
    partial: false,
    schema: DefaultSchema,
    transform(model: AnyModel, op: string, item: AnyEntity) {
        if (op === 'read') {
            if (item.name) {
                item.name = Buffer.from(item.name, 'base64').toString()
            }
        }
        if (op === 'write') {
            if (item.name) {
                item.name = Buffer.from(item.name).toString('base64')
            }
        }
        return item
    },
})

let User
let user

describe('Table Transform', () => {
    test('Create Table', async () => {
        if (!(await table.exists())) {
            await table.createTable()
            expect(await table.exists()).toBe(true)
        }
        User = table.getModel('User')
    })

    test('Create with transform', async () => {
        const properties = {
            name: 'Peter Smith',
            email: 'peter@example.com',
        }
        user = await User.create(properties)
        expect(user.name).toEqual(properties.name)
    })

    test('Update with transform', async () => {
        user = await User.update({id: user.id, name: 'Marcelo'})
        expect(user.name).toEqual('Marcelo')
    })

    test('Get with transform', async () => {
        user = await User.get({id: user.id})
        expect(user.name).toEqual('Marcelo')
    })

    test('Destroy Table', async () => {
        await table.deleteTable('DeleteTableForever')
        expect(await table.exists()).toBe(false)
    })
})
