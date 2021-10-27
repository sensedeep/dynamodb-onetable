/*
    hooks.ts - Test table and model callback hooks
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

// jest.setTimeout(7200 * 1000)

var hooked = 0

const table = new Table({
    name: 'HookTable',
    client: Client,
    schema: DefaultSchema,
    logger: true,
    transform: (model, op, item, properties, params) => {
        expect(properties._type).toBe('User')
        hooked++
        return item
    },
})
const accountId = table.uuid()

test('Create Table', async() => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof DefaultSchema.models.User>
let User = table.getModel<UserType>('User')
let user: UserType = null
let users: any

test('Test', async() => {
    let transformed = 0
    user = await User.create({
        email: 'coy@acme.com',
    }, {
        transform(model, op, name, value) {
            //  Used to transform the property value before writing and after reading
            expect(op == 'read' || op == 'write').toBe(true)
            expect(name).toBeDefined()
            expect(value).toBeDefined()
            transformed++
            return value
        },
        preFormat(model, expression) {
            //  Used to modify the expression before the DynamoDB command is created
            hooked++
        },
        postFormat(model, cmd: any) {
            //  Used to modify the command before submitting to DynamoDB (last chance)
            hooked++
            expect(cmd.TableName).toBe(table.name)
            expect(typeof cmd).toBe('object')
            return cmd
        },
    })
    expect(hooked).toBe(3)
    expect(transformed).toBeGreaterThan(10)
})

test('Destroy Table', async() => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
