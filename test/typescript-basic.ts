/*
    typescript-basic.ts - Typescript Basic create, read, update delete

    Uses table schema and not inline model schemas
 */
import {AWS, Client, Entity, Model, Table, print, dump, delay} from './utils/init'
import {NestedSchema} from './schemas'
import {TransactionCanceledException} from '@aws-sdk/client-dynamodb'

// jest.setTimeout(7200 * 1000)

describe('TypeScript', () => {
    const table = new Table({
        name: 'TypeScriptCrudTestTable',
        client: Client,
        partial: false,
        schema: NestedSchema,
    })

    test('Create Table', async () => {
        if (!(await table.exists())) {
            await table.createTable()
            expect(await table.exists()).toBe(true)
        }
    })

    type UserType = Entity<typeof NestedSchema.models.User>
    let User = table.getModel('User')
    let user: UserType

    const Properties: UserType = {
        name: 'Peter Smith',
        email: 'peter@example.com',
        status: 'active',
        location: {
            //  Typescript will not (yet) validate the types of nested schemas
            address: '444 Cherry Tree Lane',
            city: 'Seattle',
            zip: '98011',
        },
        balance: 0,
        tokens: ['red', 'white', 'blue'],
        buffer: new ArrayBuffer(16),
    }

    test('Create', async () => {
        user = await User.create(Properties)
        expect(user).toMatchObject(Properties)
    })

    test('Update', async () => {
        user = await User.update({id: user.id, status: 'inactive'})
    })

    test('Remove attribute', async () => {
        //  Remove attribute by setting to null
        user = await User.update({id: user.id, status: null})
    })

    test('Remove attribute 2', async () => {
        //  Update and remove attributes using {remove}
        user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk']})
    })

    let users: any
    test('Scan', async () => {
        users = await User.scan({})
        // console.log('FOUND users', users)
    })

    test('Remove', async () => {
        for (let user of users) {
            await User.remove({id: user.id})
        }
    })

    test('Check condition fails', async () => {
        const transaction = {}
        User.check({id: 'unknownUserId'}, {transaction, exists: true})
        await User.create(Properties, {transaction})
        const result = await table.transact('write', transaction).catch((e) => e)
        expect(result).not.toBe(undefined)
    })

    test('Check condition should not exist', async () => {
        const transaction = {}
        User.check({id: 'unknownUserId'}, {transaction, exists: false})
        const expected = await User.create(Properties, {transaction})
        await table.transact('write', transaction)
    })

    test('Check condition should exist', async () => {
        const existing = await User.create(Properties)

        const transaction = {}
        User.check({id: existing.id}, {transaction, exists: true})

        await User.create(Properties, {transaction})
        await table.transact('write', transaction)
    })

    test('Destroy Table', async () => {
        await table.deleteTable('DeleteTableForever')
        expect(await table.exists()).toBe(false)
    })
})
