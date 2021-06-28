/*
    typescript.ts - Typescript Basic create, read, update delete
 */
import {AWS, Client, Model, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

describe.skip('Crud', () => {

    const table = new Table({
        name: 'TypeScriptTestTable',
        client: Client,
        schema: DefaultSchema,
    })

    test('Create Table', async() => {
        if (!(await table.exists())) {
            await table.createTable()
            expect(await table.exists()).toBe(true)
        }
    })

    // type UserType = Entity<typeof DefaultSchema.models.User>
    // let User: Model<UserType> = table.getModel('User')
    // let user: any

    /*
    test('Validate user', () => {
        User = table.getModel('User')
        expect(User).toEqual({
            name: 'User',
            hash: 'pk',
            sort: 'sk',
        })
    })

    test('Create', async() => {
        user = await User.create({name: 'Peter Smith'})
        expect(user).toEqual({
            name: 'Peter Smith'
        })
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
    */

    test('Destroy Table', async() => {
        await table.deleteTable('DeleteTableForever')
        expect(await table.exists()).toBe(false)
    })
})
