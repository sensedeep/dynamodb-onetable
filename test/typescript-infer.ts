import {Entity, Table} from './utils/init'

const Schema = {
    format: 'onetable:1.1.0',
    version: '0.0.1',
    indexes: {
        primary: {hash: 'pk', sort: 'sk', project: 'all'},
        gs1: {hash: 'gs1pk', sort: 'gs1sk', project: 'all'},
    },
    models: {
        User: {
            pk: {type: 'string', value: '${_type}#'},
            sk: {type: 'string', value: '${_type}#${id}'},

            gs1pk: {type: 'string', value: '${_type}#'},
            gs1sk: {type: 'string', value: '${_type}#${id}'},

            id: {type: 'string', generate: 'ulid'},
            name: {type: 'string', required: true},
            email: {type: 'string'},
        },
    } as const,
}

describe('Typescript infer', () => {
    const table = new Table({
        name: 'test',
        partial: false,
        schema: Schema,
    })

    type UserType = Entity<typeof Schema.models.User>

    const User = table.getModel('User')
    const User1 = table.getModel('User')

    test('Get model', () => {
        expect(async () => {
            // @ts-expect-error only allow models that exist
            const User2 = table.getModel('User1')
            // @ts-expect-error only allow models that exist
            const User3 = table.getModel('User1')
        }).rejects.toThrow()
    })

    test('Create', async () => {
        const properties = {
            // name: 'Michael',
            email: 'user@example.com',
        }

        await expect(async () => {
            // @ts-expect-error check missing properties
            const user = await User.create(properties)

            // @ts-expect-error check missing properties
            const user1 = await User1.create(properties)
        }).rejects.toThrow()
    })
})
