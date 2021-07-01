/*
    misc.ts - Miscellaneous tests
 */
import {AWS, Client, Dynamo, Match, Table, print, dump, delay} from './utils/init'
import {DefaultSchema} from './schemas'

const table = new Table({
    name: 'MiscTestTable',
    client: Client,
    schema: DefaultSchema,
    logger: true,
    timestamps: true,
    uuid: 'ulid',
})

test('Dynamo empty constructor', async() => {
    let dynamo = new Dynamo()
    expect(dynamo).toBeDefined()
})
