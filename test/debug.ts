/*
    Test just for debugging the latest great code idea
 */
import {AWS, Client, Table, print, dump, delay} from './utils/init'
import {DebugSchema} from './schemas'

describe.skip('Debug only', () => {
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
        }, { log: true })                  //  Emit console trace for the command and result
    })

    test('Remove User', async() => {
        user = await User.update({id: user.id}, { set: { 'location.zip': '{98030}' } })
    })

    test('Destroy', async() => {
        await table.deleteTable('DeleteTableForever')
    })
})
