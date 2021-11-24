/*
    typescript-crud.ts - Typescript Basic create, read, update delete

    Uses table schema and not inline model schemas
 */
import {AWS, Client, Entity, Model, Table, print, dump, delay} from './utils/init'
import {NestedSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

describe('TypeScript', () => {

    const table = new Table({
        name: 'TypeScriptCrudTestTable',
        client: Client,
        schema: NestedSchema,
    })

    test('Create Table', async() => {
        if (!(await table.exists())) {
            await table.createTable()
            expect(await table.exists()).toBe(true)
        }
    })

    type UserType = Entity<typeof NestedSchema.models.User>
    let User = table.getModel<UserType>('User')
    let user: UserType = null

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
    }

    test('Create', async() => {
        user = await User.create(Properties)
        expect(user).toMatchObject(Properties)
    })

    test('Update', async() => {
        user = await User.update({id: user.id, status: 'inactive'})
    })

    test('Remove attribute', async() => {
        //  Remove attribute by setting to null
        user = await User.update({id: user.id, status: null})
    })

    test('Remove attribute 2', async() => {
        //  Update and remove attributes using {remove}
        user = await User.update({id: user.id, status: 'active'}, {remove: ['gs1pk', 'gs1sk']})
    })

    let users: any
    test('Scan', async() => {
        users = await User.scan({})
        // console.log('FOUND users', users)
    })

    test('Remove', async() => {
        for (let user of users) {
            await User.remove({id: user.id})
        }
    })

    test('Destroy Table', async() => {
        await table.deleteTable('DeleteTableForever')
        expect(await table.exists()).toBe(false)
    })
})
