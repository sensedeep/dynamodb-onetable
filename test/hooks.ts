/*
    hooks.ts - Test table and model callback hooks
 */
import {AWS, Client, Entity, Match, Model, Table, print, dump, delay} from './utils/init'

// jest.setTimeout(7200 * 1000)

const schema = {
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk'},
    },
    models: {
        User: {
            pk: {type: String, value: '${_type}#${email}'},
            sk: {type: String, value: '${_type}#'},
            email: {type: String},
            name: {type: String},
            speed: {type: String, value: true},
        },
    },
}

const table = new Table({
    name: 'HookTable',
    client: Client,
    partial: false,
    schema,
    logger: true,
    transform(model, op, item, properties, params, raw) {
        if (op == 'write') {
            item.name = properties.email.toUpperCase()
        }
        return item
    },
    validate: (model, properties, params) => {
        if (properties.name == 'unknown') {
            return {name: 'Unknown character name'}
        }
        return {}
    },
    value: (model, fieldName, properties, params) => {
        if (fieldName == 'speed') {
            if (properties.email == 'roadrunner@acme.com') return 'fast'
        }
        return 'slow'
    },
})

const accountId = table.uuid()

test('Create Table', async () => {
    if (!(await table.exists())) {
        await table.createTable()
        expect(await table.exists()).toBe(true)
    }
})

type UserType = Entity<typeof schema.models.User>
let User = table.getModel('User')
let user: UserType
let users: any

test('Test Post Format', async () => {
    let invoked = 0
    user = await User.create(
        {
            email: 'coyote@acme.com',
            name: 'Coyote',
        },
        {
            postFormat(model, cmd: any) {
                //  Used to modify the command before submitting to DynamoDB (last chance)
                invoked++
                expect(cmd.TableName).toBe(table.name)
                expect(typeof cmd).toBe('object')
                return cmd
            },
        }
    )
    expect(invoked).toBe(1)
})

test('Test Transform', async () => {
    user = await User.create({email: 'roadrunner@acme.com', name: 'Road Runner'}, {hidden: true})
    expect(user.name).toBe('ROADRUNNER@ACME.COM')
    expect(user.speed).toBe('fast')
})

test('Test value', async () => {
    user = await User.create({email: 'devil@acme.com', name: 'Tasmanian Devil'}, {hidden: true})
    expect(user.speed).toBe('slow')
})

test('Test Validate', async () => {
    let caught = false

    await expect(async () => {
        try {
            user = await User.create({email: 'beeper@acme.com', name: 'unknown'}, {hidden: true})
        } catch (err) {
            expect(err.code).toBe('ValidationError')
            expect(err.context.validation.name).toBe('Unknown character name')
            caught = true
            throw err
        }
    }).rejects.toThrow()
    expect(caught).toBe(true)
})

test('Destroy Table', async () => {
    await table.deleteTable('DeleteTableForever')
    expect(await table.exists()).toBe(false)
})
