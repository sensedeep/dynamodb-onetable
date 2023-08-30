/*
    typescript-basic.ts - Typescript Basic create, read, update delete

    Uses table schema and not inline model schemas
 */
import {Client, Entity, Model, Table, print, dump, delay} from './utils/init'
import {NestedSchema} from './schemas'

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

    type User = Entity<typeof NestedSchema.models.User>
    let UserModel = table.getModel('User')
    let user: User | undefined

    const Properties = {
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
        user = await UserModel.create(Properties)
        expect(user).toMatchObject(Properties)
    })

    test('Update', async () => {
        user = await UserModel.update({id: user!.id, status: 'inactive'})
    })

    test('Remove attribute', async () => {
        //  Remove attribute by setting to null
        user = await UserModel.update({id: user!.id, status: null})
    })

    test('Remove attribute 2', async () => {
        //  Update and remove attributes using {remove}
        user = await UserModel.update({id: user!.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk']})
    })

    let users: any
    test('Scan', async () => {
        users = await UserModel.scan({})
        // console.log('FOUND users', users)
    })

    test('Remove', async () => {
        for (let user of users) {
            await UserModel.remove({id: user.id})
        }
    })

    test('Check condition fails', async () => {
        const transaction = {}
        UserModel.check({id: 'unknownUserId'}, {transaction, exists: true})
        await UserModel.create(Properties, {transaction})
        const result = await table.transact('write', transaction).catch((e) => e)
        expect(result).not.toBe(undefined)
    })

    test('Check condition should not exist', async () => {
        const transaction = {}
        UserModel.check({id: 'unknownUserId'}, {transaction, exists: false})
        const expected = await UserModel.create(Properties, {transaction})
        await table.transact('write', transaction)
    })

    test('Check condition should exist', async () => {
        const existing = await UserModel.create(Properties)

        const transaction = {}
        UserModel.check({id: existing.id}, {transaction, exists: true})

        await UserModel.create(Properties, {transaction})
        await table.transact('write', transaction)
    })

    test('Destroy Table', async () => {
        await table.deleteTable('DeleteTableForever')
        expect(await table.exists()).toBe(false)
    })
})
